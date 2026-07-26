import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../store/authStore';

const STATUS_LABEL = { draft: 'черновик', active: 'идёт', finished: 'завершён' };
const STATUS_BADGE = { draft: 'badge-ghost', active: 'badge-success', finished: 'badge-neutral' };

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>;
}

function OrganizerDashboard() {
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/quizzes/mine').then(setQuizzes).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Мои квизы</h1>
        <Link to="/quizzes/new" className="btn btn-primary btn-sm">
          + Создать квиз
        </Link>
      </div>

      {error && <p className="text-error">{error}</p>}
      {quizzes === null && !error && <span className="loading loading-spinner" />}
      {quizzes?.length === 0 && <p className="opacity-70">Квизов пока нет — создайте первый.</p>}

      <ul className="flex flex-col gap-2">
        {quizzes?.map((q) => (
          <li key={q.id} className="card bg-base-200">
            <div className="card-body py-3 px-4 flex-row items-center justify-between">
              <div>
                <div className="font-medium">{q.title}</div>
                <div className="text-sm opacity-70">
                  код: <span className="font-mono">{q.roomCode}</span> <StatusBadge status={q.status} />
                </div>
              </div>
              <div className="flex gap-2">
                {q.status === 'draft' && (
                  <Link to={`/quizzes/${q.id}/edit`} className="btn btn-sm">
                    Редактировать
                  </Link>
                )}
                {q.status !== 'finished' && (
                  <Link to={`/room/${q.roomCode}/lobby`} className="btn btn-sm btn-primary">
                    {q.status === 'draft' ? 'Открыть комнату' : 'Продолжить'}
                  </Link>
                )}
                {q.status === 'finished' && (
                  <Link to={`/room/${q.roomCode}/results`} className="btn btn-sm">
                    Результаты
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ParticipantDashboard() {
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [history, setHistory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/quizzes/history/mine').then(setHistory).catch(() => {});
  }, []);

  function handleJoin(e) {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    setJoinError('');
    navigate(`/room/${code}/lobby`);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-3">Подключиться к квизу</h1>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="input input-bordered font-mono uppercase"
            placeholder="Код комнаты"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            maxLength={6}
          />
          <button type="submit" className="btn btn-primary">
            Войти
          </button>
        </form>
        {joinError && <p className="text-error mt-2">{joinError}</p>}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">История участия</h2>
        {history?.length === 0 && <p className="opacity-70">Пока нет пройденных квизов.</p>}
        <ul className="flex flex-col gap-2">
          {history?.map((r) => (
            <li key={r.id} className="card bg-base-200">
              <div className="card-body py-3 px-4 flex-row items-center justify-between">
                <span>{r.quiz.title}</span>
                <span className="font-mono">{r.score} очков</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  return user.role === 'organizer' ? <OrganizerDashboard /> : <ParticipantDashboard />;
}
