import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { connectSocket } from '../sockets/socket';
import { useAuthStore } from '../store/authStore';

export default function QuizRoom() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [qState, setQState] = useState(location.state || null); // { question, startedAt, deadlineAt }
  const [selectedIds, setSelectedIds] = useState([]);
  const [answerResult, setAnswerResult] = useState(null); // { isCorrect } | null
  const [revealed, setRevealed] = useState(null); // { questionId, correctOptionIds }
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const questionIdRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();

    function handleQuestionStart(data) {
      setQState(data);
      setSelectedIds([]);
      setAnswerResult(null);
      setRevealed(null);
    }

    function handleQuestionEnd(data) {
      setRevealed(data);
    }

    function handleFinished(data) {
      navigate(`/room/${roomCode}/results`, { state: data, replace: true });
    }

    socket.on('question:start', handleQuestionStart);
    socket.on('question:end', handleQuestionEnd);
    socket.on('quiz:finished', handleFinished);

    // Ресинк на случай прямого захода на /play (обновление страницы) — не полагаемся
    // только на location.state, а всегда переподтверждаем join и берём актуальное состояние.
    socket.emit('room:join', { roomCode }, (res) => {
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.quiz.status === 'finished') {
        navigate(`/room/${roomCode}/results`, { replace: true });
        return;
      }
      if (res.currentQuestion) {
        setQState((prev) => (prev && prev.question.id === res.currentQuestion.question.id ? prev : res.currentQuestion));
      }
    });

    return () => {
      socket.off('question:start', handleQuestionStart);
      socket.off('question:end', handleQuestionEnd);
      socket.off('quiz:finished', handleFinished);
    };
  }, [roomCode, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col gap-3 items-start">
        <p className="text-error">{error}</p>
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>
          На главную
        </button>
      </div>
    );
  }

  if (!qState) return <span className="loading loading-spinner" />;

  const { question, deadlineAt } = qState;
  const remainingMs = Math.max(0, deadlineAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const expired = remainingMs <= 0;
  const alreadySubmitted = answerResult !== null;
  const isParticipant = user.role === 'participant';
  const showReveal = revealed && revealed.questionId === question.id;

  function toggleOption(optId) {
    if (alreadySubmitted || expired) return;
    setSelectedIds((prev) => {
      if (question.type === 'single') return [optId];
      return prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId];
    });
  }

  function handleSubmit() {
    if (selectedIds.length === 0) return;
    const socket = connectSocket();
    socket.emit('answer:submit', { roomCode, questionId: question.id, selectedOptionIds: selectedIds }, (res) => {
      if (res.error) {
        setError(res.error);
        return;
      }
      setAnswerResult({ isCorrect: res.isCorrect });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <span className="opacity-70">
          Вопрос {question.index + 1} из {question.total}
        </span>
        <span className={`font-mono text-lg ${remainingSec <= 5 ? 'text-error' : ''}`}>{remainingSec}с</span>
      </div>

      <progress className="progress w-full" value={remainingMs} max={question.timeLimit * 1000} />

      <h1 className="text-xl font-semibold">{question.text}</h1>
      {question.imageUrl && <img src={question.imageUrl} alt="" className="max-h-64 rounded-box mx-auto" />}

      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isCorrectReveal = showReveal && revealed.correctOptionIds.includes(opt.id);
          const isSelected = selectedIds.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-box border ${
                isCorrectReveal ? 'border-success bg-success/10' : 'border-base-300'
              } ${isSelected ? 'bg-base-200' : ''}`}
            >
              <input
                type={question.type === 'single' ? 'radio' : 'checkbox'}
                className={question.type === 'single' ? 'radio' : 'checkbox'}
                checked={isSelected}
                disabled={!isParticipant || alreadySubmitted || expired}
                onChange={() => toggleOption(opt.id)}
              />
              {opt.text}
            </label>
          );
        })}
      </div>

      {isParticipant && !alreadySubmitted && (
        <button className="btn btn-primary w-fit" onClick={handleSubmit} disabled={expired || selectedIds.length === 0}>
          Ответить
        </button>
      )}

      {answerResult && (
        <p className={answerResult.isCorrect ? 'text-success' : 'text-error'}>
          {answerResult.isCorrect ? 'Верно!' : 'Неверно'}
        </p>
      )}

      {!isParticipant && <p className="opacity-60 text-sm">Вы наблюдаете за квизом как организатор.</p>}
    </div>
  );
}
