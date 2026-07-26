const { Router } = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = Router();
const QUESTION_TYPES = ['single', 'multiple'];
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов (0/O, 1/I)

function generateRoomCodeCandidate() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCodeCandidate();
    const existing = await prisma.quiz.findUnique({ where: { roomCode: code } });
    if (!existing) return code;
  }
  throw new Error('Не удалось сгенерировать уникальный код комнаты');
}

async function loadOwnedQuiz(id, organizerId) {
  const quiz = await prisma.quiz.findUnique({ where: { id: Number(id) } });
  if (!quiz || quiz.organizerId !== organizerId) return null;
  return quiz;
}

// --- Организатор ---

router.post('/', requireAuth, requireRole('organizer'), async (req, res) => {
  const { title, category, rules } = req.body;
  if (!title) return res.status(400).json({ error: 'title обязателен' });

  const roomCode = await generateUniqueRoomCode();
  const quiz = await prisma.quiz.create({
    data: { title, category, rules, roomCode, organizerId: req.user.id },
  });

  res.status(201).json(quiz);
});

router.get('/mine', requireAuth, requireRole('organizer'), async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { organizerId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(quizzes);
});

router.get('/:id', requireAuth, requireRole('organizer'), async (req, res) => {
  const quiz = await loadOwnedQuiz(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });

  const questions = await prisma.question.findMany({
    where: { quizId: quiz.id },
    orderBy: { order: 'asc' },
    include: { options: true },
  });

  res.json({ ...quiz, questions });
});

router.patch('/:id', requireAuth, requireRole('organizer'), async (req, res) => {
  const quiz = await loadOwnedQuiz(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  if (quiz.status !== 'draft') return res.status(400).json({ error: 'Редактировать можно только черновик' });

  const { title, category, rules } = req.body;
  const updated = await prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(rules !== undefined && { rules }),
    },
  });

  res.json(updated);
});

router.post('/:id/questions', requireAuth, requireRole('organizer'), upload.single('image'), async (req, res) => {
  const quiz = await loadOwnedQuiz(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  if (quiz.status !== 'draft') return res.status(400).json({ error: 'Добавлять вопросы можно только в черновик' });

  const { text, type, timeLimit, order } = req.body;
  let options = req.body.options;
  if (typeof options === 'string') options = JSON.parse(options);

  if (!text || !QUESTION_TYPES.includes(type) || !timeLimit || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({
      error: 'text, type (single|multiple), timeLimit и минимум 2 options [{text, isCorrect}] обязательны',
    });
  }
  if (!options.some((o) => o.isCorrect)) {
    return res.status(400).json({ error: 'Хотя бы один вариант должен быть правильным' });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const question = await prisma.question.create({
    data: {
      text,
      imageUrl,
      type,
      timeLimit: Number(timeLimit),
      order: order !== undefined ? Number(order) : 0,
      quizId: quiz.id,
      options: { create: options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })) },
    },
    include: { options: true },
  });

  res.status(201).json(question);
});

router.delete('/:id/questions/:questionId', requireAuth, requireRole('organizer'), async (req, res) => {
  const quiz = await loadOwnedQuiz(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  if (quiz.status !== 'draft') return res.status(400).json({ error: 'Удалять вопросы можно только в черновике' });

  const question = await prisma.question.findUnique({ where: { id: Number(req.params.questionId) } });
  if (!question || question.quizId !== quiz.id) return res.status(404).json({ error: 'Вопрос не найден' });

  await prisma.option.deleteMany({ where: { questionId: question.id } });
  await prisma.question.delete({ where: { id: question.id } });

  res.status(204).end();
});

// --- Участник ---

router.get('/room/:roomCode', requireAuth, async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { roomCode: req.params.roomCode.toUpperCase() } });
  if (!quiz || quiz.status === 'finished') {
    return res.status(404).json({ error: 'Комната не найдена или квиз уже завершён' });
  }

  res.json({ id: quiz.id, title: quiz.title, category: quiz.category, status: quiz.status, roomCode: quiz.roomCode });
});

router.get('/room/:roomCode/results', requireAuth, async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { roomCode: req.params.roomCode.toUpperCase() } });
  if (!quiz) return res.status(404).json({ error: 'Комната не найдена' });

  const isOwner = quiz.organizerId === req.user.id;
  if (!isOwner) {
    const participated = await prisma.result.findUnique({
      where: { quizId_userId: { quizId: quiz.id, userId: req.user.id } },
    });
    if (!participated) return res.status(403).json({ error: 'Нет доступа к результатам этого квиза' });
  }

  const results = await prisma.result.findMany({
    where: { quizId: quiz.id },
    include: { user: true },
    orderBy: { score: 'desc' },
  });

  res.json({
    quiz: { id: quiz.id, title: quiz.title, status: quiz.status, roomCode: quiz.roomCode },
    leaderboard: results.map((r) => ({ userId: r.userId, name: r.user.name, score: r.score })),
  });
});

router.get('/history/mine', requireAuth, requireRole('participant'), async (req, res) => {
  const results = await prisma.result.findMany({
    where: { userId: req.user.id },
    include: { quiz: true },
    orderBy: { id: 'desc' },
  });
  res.json(results);
});

module.exports = router;
