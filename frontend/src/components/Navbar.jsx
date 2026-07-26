import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="navbar bg-base-200 px-4">
      <div className="flex-1">
        <Link to="/dashboard" className="text-lg font-semibold">
          Quiz App
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm opacity-70">
          {user.name} · {user.role === 'organizer' ? 'организатор' : 'участник'}
        </span>
        <button
          className="btn btn-sm"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
