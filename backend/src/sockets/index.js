const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const POINTS_PER_CORRECT = 100;

// roomCode -> { quizId, organizerId, questions, currentIndex, deadlineAt, timer,
//               participants: Map<userId, name>, participantSockets: Map<userId, Set<socketId>> }
const rooms = new Map();

// Присутствие считаем по количеству живых сокетов на пользователя, а не по факту одного
// disconnect — иначе закрытие одной вкладки убирает участника, даже если у него открыта другая.
function addParticipantSocket(room, userId, socketId) {
  if (!room.participantSockets) room.participantSockets = new Map();
  let sockets = room.participantSockets.get(userId);
  if (!sockets) {
    sockets = new Set();
    room.participantSockets.set(userId, sockets);
  }
  sockets.add(socketId);
}

// Возвращает true, если это был последний сокет пользователя в комнате (пора убрать из lobby)
function removeParticipantSocket(room, userId, socketId) {
  const sockets = room.participantSockets?.get(userId);
  if (!sockets) return true;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    room.participantSockets.delete(userId);
    return true;
  }
  return false;
}

function publicQuestion(question, index, total) {
  return {
    id: question.id,
    text: question.text,
    imageUrl: question.imageUrl,
    type: question.type,
    timeLimit: question.timeLimit,
    index,
    total,
    options: question.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

function sortedIds(arr) {
  return [...arr].sort((a, b) => a - b);
}

function isAnswerCorrect(question, selectedOptionIds) {
  const correct = sortedIds(question.options.filter((o) => o.isCorrect).map((o) => o.id));
  const selected = sortedIds([...new Set(selectedOptionIds)]);
  return correct.length === selected.length && correct.every((id, i) => id === selected[i]);
}

async function buildLeaderboard(quizId) {
  const results = await prisma.result.findMany({
    where: { quizId },
    include: { user: true },
    orderBy: { score: 'desc' },
  });
  return results.map((r) => ({ userId: r.userId, name: r.user.name, score: r.score }));
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('no token');
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  async function advanceQuestion(io, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.currentIndex += 1;

    // Показать правильные ответы на предыдущий вопрос перед следующим
    const prevQuestion = room.questions[room.currentIndex - 1];
    if (prevQuestion) {
      io.to(roomCode).emit('question:end', {
        questionId: prevQuestion.id,
        correctOptionIds: prevQuestion.options.filter((o) => o.isCorrect).map((o) => o.id),
      });
    }

    if (room.currentIndex >= room.questions.length) {
      await finishQuiz(io, roomCode);
      return;
    }

    const question = room.questions[room.currentIndex];
    const startedAt = Date.now();
    const deadlineAt = startedAt + question.timeLimit * 1000;
    room.startedAt = startedAt;
    room.deadlineAt = deadlineAt;

    io.to(roomCode).emit('question:start', {
      question: publicQuestion(question, room.currentIndex, room.questions.length),
      startedAt,
      deadlineAt,
    });

    room.timer = setTimeout(() => advanceQuestion(io, roomCode), question.timeLimit * 1000);
  }

  async function finishQuiz(io, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    clearTimeout(room.timer);
    await prisma.quiz.update({ where: { id: room.quizId }, data: { status: 'finished' } });
    const leaderboard = await buildLeaderboard(room.quizId);
    io.to(roomCode).emit('quiz:finished', { leaderboard });
    rooms.delete(roomCode);
  }

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ roomCode }, ack = () => {}) => {
      try {
        const quiz = await prisma.quiz.findUnique({ where: { roomCode } });
        if (!quiz || quiz.status === 'finished') {
          return ack({ error: 'Комната не найдена или квиз уже завершён' });
        }

        socket.join(roomCode);
        socket.data.roomCode = roomCode;

        let room = rooms.get(roomCode);
        if (!room) {
          room = { quizId: quiz.id, organizerId: quiz.organizerId, questions: null, currentIndex: -1, participants: new Map() };
          rooms.set(roomCode, room);
        }

        if (socket.user.role === 'participant') {
          await prisma.result.upsert({
            where: { quizId_userId: { quizId: quiz.id, userId: socket.user.id } },
            create: { quizId: quiz.id, userId: socket.user.id, score: 0 },
            update: {},
          });

          addParticipantSocket(room, socket.user.id, socket.id);
          room.participants.set(socket.user.id, socket.user.name);
          io.to(roomCode).emit('lobby:update', { participants: [...room.participants.values()] });
        }

        // Ресинк для переподключения: если вопрос уже активен, присылаем его состояние
        // тем же форматом, что и question:start, а не молчим до следующего авто-перехода
        let currentQuestion = null;
        if (room.questions && room.currentIndex >= 0 && room.currentIndex < room.questions.length) {
          currentQuestion = {
            question: publicQuestion(room.questions[room.currentIndex], room.currentIndex, room.questions.length),
            startedAt: room.startedAt,
            deadlineAt: room.deadlineAt,
          };
        }

        ack({
          ok: true,
          quiz: { id: quiz.id, title: quiz.title, status: quiz.status, organizerId: quiz.organizerId },
          currentQuestion,
        });
      } catch (err) {
        ack({ error: 'Не удалось подключиться к комнате' });
      }
    });

    socket.on('quiz:start', async ({ roomCode }, ack = () => {}) => {
      try {
        const quiz = await prisma.quiz.findUnique({ where: { roomCode } });
        if (!quiz || quiz.organizerId !== socket.user.id) {
          return ack({ error: 'Нет прав на запуск этого квиза' });
        }
        if (quiz.status !== 'draft') return ack({ error: 'Квиз уже запущен или завершён' });

        const questions = await prisma.question.findMany({
          where: { quizId: quiz.id },
          orderBy: { order: 'asc' },
          include: { options: true },
        });
        if (questions.length === 0) return ack({ error: 'В квизе нет вопросов' });

        await prisma.quiz.update({ where: { id: quiz.id }, data: { status: 'active' } });

        let room = rooms.get(roomCode);
        if (!room) {
          room = { quizId: quiz.id, organizerId: quiz.organizerId, participants: new Map() };
          rooms.set(roomCode, room);
        }
        room.questions = questions;
        room.currentIndex = -1;

        ack({ ok: true });
        advanceQuestion(io, roomCode);
      } catch (err) {
        ack({ error: 'Не удалось запустить квиз' });
      }
    });

    socket.on('answer:submit', async ({ roomCode, questionId, selectedOptionIds }, ack = () => {}) => {
      try {
        if (socket.user.role !== 'participant') return ack({ error: 'Только участник может отвечать' });

        const room = rooms.get(roomCode);
        if (!room || !room.questions) return ack({ error: 'Квиз ещё не запущен' });

        const question = room.questions[room.currentIndex];
        if (!question || question.id !== questionId) {
          return ack({ error: 'Этот вопрос больше не активен' });
        }
        // Сервер — единственный источник истины по дедлайну, клиентский таймер не учитывается
        if (Date.now() > room.deadlineAt) {
          return ack({ error: 'Время на ответ истекло' });
        }

        const validOptionIds = new Set(question.options.map((o) => o.id));
        const cleanSelectedIds = [...new Set(selectedOptionIds || [])].filter((id) => validOptionIds.has(id));
        if (cleanSelectedIds.length === 0) return ack({ error: 'Нужно выбрать хотя бы один вариант из вопроса' });

        const correct = isAnswerCorrect(question, cleanSelectedIds);

        let answer;
        try {
          answer = await prisma.answer.create({
            data: {
              questionId: question.id,
              userId: socket.user.id,
              isCorrect: correct,
              selectedOptions: { connect: cleanSelectedIds.map((id) => ({ id })) },
            },
          });
        } catch {
          return ack({ error: 'Ответ на этот вопрос уже был засчитан' });
        }

        if (correct) {
          await prisma.result.upsert({
            where: { quizId_userId: { quizId: room.quizId, userId: socket.user.id } },
            create: { quizId: room.quizId, userId: socket.user.id, score: POINTS_PER_CORRECT },
            update: { score: { increment: POINTS_PER_CORRECT } },
          });
        }

        ack({ ok: true, isCorrect: correct, answerId: answer.id });
      } catch (err) {
        ack({ error: 'Не удалось принять ответ' });
      }
    });

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      const room = roomCode && rooms.get(roomCode);
      if (room && socket.user?.role === 'participant') {
        const wasLastSocket = removeParticipantSocket(room, socket.user.id, socket.id);
        if (wasLastSocket) {
          room.participants.delete(socket.user.id);
          io.to(roomCode).emit('lobby:update', { participants: [...room.participants.values()] });
        }
      }
    });
  });
}

module.exports = registerSocketHandlers;
