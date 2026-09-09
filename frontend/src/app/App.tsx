import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import PageLoader from '../shared/components/PageLoader';
import { PAGE_ACCESS } from '../shared/auth/roles';
import PrivateRoute from '../shared/guards/PrivateRoute';
import RoleRoute from '../shared/guards/RoleRoute';
import MainLayout from '../shared/layouts/MainLayout';
import { useAppStore } from './store';

// Lazy-loaded pages
const HomePage = React.lazy(() => import('../modules/public/pages/HomePage'));
const LoginPage = React.lazy(() => import('../modules/auth/pages/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('../modules/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('../modules/auth/pages/ResetPasswordPage'));
const ContactAdminPage = React.lazy(() => import('../modules/auth/pages/ContactAdminPage'));
const AccessDeniedPage = React.lazy(() => import('../shared/components/AccessDeniedPage'));

const DashboardPage = React.lazy(() => import('../modules/dashboard/pages/DashboardPage'));
const CartePage = React.lazy(() => import('../modules/cartographie/pages/CartePage'));
const AnalyseMulticriterePage = React.lazy(() => import('../modules/analyse/pages/AnalyseMulticriterePage'));
const SolapExplorerPage = React.lazy(() => import('../modules/analyse/pages/SolapExplorerPage'));
const AnalyseHistoriquePage = React.lazy(() => import('../modules/analyse/pages/AnalyseHistoriquePage'));
const AlertesPage = React.lazy(() => import('../modules/alertes/pages/AlertesPage'));
const DonneesPage = React.lazy(() => import('../modules/donnees/pages/DonneesPage'));
const RapportsPage = React.lazy(() => import('../modules/rapports/pages/RapportsPage'));
const ParametresPage = React.lazy(() => import('../modules/parametres/pages/ParametresPage'));
const UsersPage = React.lazy(() => import('../modules/administration/pages/UsersPage'));
const AccountRequestsPage = React.lazy(() => import('../modules/administration/pages/AccountRequestsPage'));
const RolesPage = React.lazy(() => import('../modules/administration/pages/RolesPage'));
const AhpWeightsPage = React.lazy(() => import('../modules/administration/pages/AhpWeightsPage'));
const ApiConfigPage = React.lazy(() => import('../modules/administration/pages/ApiConfigPage'));
const AidePage = React.lazy(() => import('../modules/aide/pages/AidePage'));

export default function App() {
  const hydrateAuth = useAppStore((state) => state.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
                <Route path="/analyse/solap" element={<SolapExplorerPage />} />
                <Route path="/analyse/historique" element={<AnalyseHistoriquePage />} />
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
                <Route path="/parametres/roles" element={<RolesPage />} />
                <Route path="/parametres/poids-ahp" element={<AhpWeightsPage />} />
                <Route path="/parametres/api" element={<ApiConfigPage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
