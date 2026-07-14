import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../app/store';

export default function PrivateRoute() {
  const token = useAppStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
