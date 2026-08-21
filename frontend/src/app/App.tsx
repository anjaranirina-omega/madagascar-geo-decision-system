import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AccountRequestsPage from '../modules/administration/pages/AccountRequestsPage';
import UsersPage from '../modules/administration/pages/UsersPage';
import AidePage from '../modules/aide/pages/AidePage';
import AlertesPage from '../modules/alertes/pages/AlertesPage';
import AnalyseMulticriterePage from '../modules/analyse/pages/AnalyseMulticriterePage';
import ContactAdminPage from '../modules/auth/pages/ContactAdminPage';
import ForgotPasswordPage from '../modules/auth/pages/ForgotPasswordPage';
import LoginPage from '../modules/auth/pages/LoginPage';
import ResetPasswordPage from '../modules/auth/pages/ResetPasswordPage';
import CartePage from '../modules/cartographie/pages/CartePage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import DonneesPage from '../modules/donnees/pages/DonneesPage';
import ParametresPage from '../modules/parametres/pages/ParametresPage';
import HomePage from '../modules/public/pages/HomePage';
import RapportsPage from '../modules/rapports/pages/RapportsPage';
import AccessDeniedPage from '../shared/components/AccessDeniedPage';
import { PAGE_ACCESS } from '../shared/auth/roles';
import PrivateRoute from '../shared/guards/PrivateRoute';
import RoleRoute from '../shared/guards/RoleRoute';
import MainLayout from '../shared/layouts/MainLayout';
import { useAppStore } from './store';

export default function App() {
  const hydrateAuth = useAppStore((state) => state.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/contact-admin" element={<ContactAdminPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/acces-refuse" element={<AccessDeniedPage />} />

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.dashboard} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.carte} />}>
              <Route path="/carte" element={<CartePage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.analyse} />}>
              <Route path="/analyse" element={<AnalyseMulticriterePage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.alertes} />}>
              <Route path="/alertes" element={<AlertesPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.donnees} />}>
              <Route path="/donnees" element={<DonneesPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.rapports} />}>
              <Route path="/rapports" element={<RapportsPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.parametres} />}>
              <Route path="/parametres" element={<ParametresPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.utilisateurs} />}>
              <Route path="/utilisateurs" element={<UsersPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.demandesComptes} />}>
              <Route path="/demandes-comptes" element={<AccountRequestsPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={PAGE_ACCESS.aide} />}>
              <Route path="/aide" element={<AidePage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
