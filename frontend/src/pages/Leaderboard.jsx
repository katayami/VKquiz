import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Leaderboard() {
  const { roomCode } = useParams();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const [leaderboard, setLeaderboard] = useState(location.state?.leaderboard || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (leaderboard) return;
    apiFetch(`/quizzes/room/${roomCode}/results`)
      .then((data) => setLeaderboard(data.leaderboard))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  if (error) return <p className="text-error">{error}</p>;
  if (!leaderboard) return <span className="loading loading-spinner" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Результаты</h1>
      <ul className="flex flex-col gap-2">
        {leaderboard.map((entry, i) => (
          <li
            key={entry.userId}
            className={`card ${entry.userId === user.id ? 'bg-primary/10 border border-primary' : 'bg-base-200'}`}
          >
            <div className="card-body py-3 px-4 flex-row items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="badge badge-lg">{i + 1}</span>
                {entry.name}
              </span>
              <span className="font-mono font-semibold">{entry.score}</span>
            </div>
          </li>
        ))}
      </ul>
      <Link to="/dashboard" className="btn w-fit">
        На главную
      </Link>
    </div>
  );
}
