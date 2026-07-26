import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import Lobby from './pages/Lobby';
import QuizRoom from './pages/QuizRoom';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-base-100">
      <Navbar />
      <main className="max-w-3xl mx-auto p-4">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/room/:roomCode/lobby" element={<Lobby />} />
            <Route path="/room/:roomCode/play" element={<QuizRoom />} />
            <Route path="/room/:roomCode/results" element={<Leaderboard />} />
          </Route>

          <Route element={<ProtectedRoute role="organizer" />}>
            <Route path="/quizzes/new" element={<CreateQuiz />} />
            <Route path="/quizzes/:id/edit" element={<CreateQuiz />} />
          </Route>

          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
