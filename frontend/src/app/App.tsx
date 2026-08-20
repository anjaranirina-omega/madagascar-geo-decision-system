import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AlertesPage from '../modules/alertes/pages/AlertesPage';
import LoginPage from '../modules/auth/pages/LoginPage';
import CartePage from '../modules/cartographie/pages/CartePage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import AnalyseMulticriterePage from '../modules/analyse/pages/AnalyseMulticriterePage';
import PlaceholderPage from '../shared/components/PlaceholderPage';
import DonneesPage from '../modules/donnees/pages/DonneesPage';
import ParametresPage from '../modules/parametres/pages/ParametresPage';
import RapportsPage from '../modules/rapports/pages/RapportsPage';
import UsersPage from '../modules/administration/pages/UsersPage';
import AccountRequestsPage from '../modules/administration/pages/AccountRequestsPage';
import PrivateRoute from '../shared/guards/PrivateRoute';
import MainLayout from '../shared/layouts/MainLayout';
import { useAppStore } from './store';
import ForgotPasswordPage from '../modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../modules/auth/pages/ResetPasswordPage';
import ContactAdminPage from '../modules/auth/pages/ContactAdminPage';
import AidePage from '../modules/aide/pages/AidePage';

export default function App() {
  const hydrateAuth = useAppStore((state) => state.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/contact-admin" element={<ContactAdminPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/carte" element={<CartePage />} />
            <Route path="/analyse" element={<AnalyseMulticriterePage />} />
            <Route path="/alertes" element={<AlertesPage />} />
            <Route path="/donnees" element={<DonneesPage />} />
            <Route path="/rapports" element={<RapportsPage />} />
            <Route path="/parametres" element={<ParametresPage />} />
            <Route path="/utilisateurs" element={<UsersPage />} />
            <Route path="/demandes-comptes" element={<AccountRequestsPage />} />
            <Route path="/aide" element={<AidePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
