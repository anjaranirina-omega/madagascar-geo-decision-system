import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../app/store';

export default function PrivateRoute() {
  const location = useLocation();
  const token = useAppStore((state) => state.token);
  const isAuthHydrated = useAppStore((state) => state.isAuthHydrated);

  if (!isAuthHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Chargement de la session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
