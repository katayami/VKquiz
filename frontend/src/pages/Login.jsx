import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('participant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center pt-10">
      <div className="card w-full max-w-sm bg-base-200 shadow-sm">
        <div className="card-body">
          <div className="tabs tabs-boxed mb-2">
            <button
              type="button"
              className={`tab ${mode === 'login' ? 'tab-active' : ''}`}
              onClick={() => setMode('login')}
            >
              Вход
            </button>
            <button
              type="button"
              className={`tab ${mode === 'register' ? 'tab-active' : ''}`}
              onClick={() => setMode('register')}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Имя"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {mode === 'register' && (
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="role"
                    className="radio"
                    checked={role === 'participant'}
                    onChange={() => setRole('participant')}
                  />
                  Участник
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="role"
                    className="radio"
                    checked={role === 'organizer'}
                    onChange={() => setRole('organizer')}
                  />
                  Организатор
                </label>
              </div>
            )}

            {error && <p className="text-error text-sm">{error}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
