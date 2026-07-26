import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket } from '../sockets/socket';
import { useAuthStore } from '../store/authStore';

function FinishedRedirect({ roomCode }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/room/${roomCode}/results`, { replace: true });
  }, [roomCode, navigate]);
  return <span className="loading loading-spinner" />;
}

export default function Lobby() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    function handleLobbyUpdate({ participants }) {
      setParticipants(participants);
    }

    function handleQuestionStart(data) {
      navigate(`/room/${roomCode}/play`, { state: data });
    }

    socket.on('lobby:update', handleLobbyUpdate);
    socket.on('question:start', handleQuestionStart);

    socket.emit('room:join', { roomCode }, (res) => {
      if (res.error) {
        setError(res.error);
        return;
      }
      setQuiz(res.quiz);
      if (res.currentQuestion) {
        navigate(`/room/${roomCode}/play`, { state: res.currentQuestion });
      }
    });

    return () => {
      socket.off('lobby:update', handleLobbyUpdate);
      socket.off('question:start', handleQuestionStart);
    };
  }, [roomCode, navigate]);

  function handleStart() {
    setStarting(true);
    setError('');
    const socket = connectSocket();
    socket.emit('quiz:start', { roomCode }, (res) => {
      setStarting(false);
      if (res.error) setError(res.error);
    });
  }

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

  if (!quiz) return <span className="loading loading-spinner" />;

  if (quiz.status === 'finished') {
    return <FinishedRedirect roomCode={roomCode} />;
  }

  const isOwner = user.role === 'organizer' && quiz.organizerId === user.id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{quiz.title}</h1>
        <p className="opacity-70">
          Код комнаты: <span className="font-mono">{roomCode}</span>
        </p>
      </div>

      <div>
        <h2 className="font-medium mb-2">Участники ({participants.length})</h2>
        <div className="flex flex-wrap gap-2">
          {participants.length === 0 && <p className="opacity-60 text-sm">Пока никто не подключился</p>}
          {participants.map((name) => (
            <span key={name} className="badge badge-lg">
              {name}
            </span>
          ))}
        </div>
      </div>

      {isOwner ? (
        <button className="btn btn-primary w-fit" onClick={handleStart} disabled={starting}>
          {starting ? <span className="loading loading-spinner loading-sm" /> : 'Начать квиз'}
        </button>
      ) : (
        <p className="opacity-70">Ждём, пока организатор начнёт квиз…</p>
      )}
    </div>
  );
}
