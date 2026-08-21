import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { AppRole, canAccessRole } from '../auth/roles';

type RoleRouteProps = {
  allowedRoles: AppRole[];
};

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const location = useLocation();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const isAuthHydrated = useAppStore((state) => state.isAuthHydrated);

  if (!isAuthHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Chargement de la session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccessRole(user?.role?.name, allowedRoles)) {
    return <Navigate to="/acces-refuse" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
