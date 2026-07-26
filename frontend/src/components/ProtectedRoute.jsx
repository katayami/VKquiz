import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ role }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
