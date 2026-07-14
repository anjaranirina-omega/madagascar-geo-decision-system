import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AlertesPage from '../modules/alertes/pages/AlertesPage';
import LoginPage from '../modules/auth/pages/LoginPage';
import CartePage from '../modules/cartographie/pages/CartePage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import PlaceholderPage from '../shared/components/PlaceholderPage';
import PrivateRoute from '../shared/guards/PrivateRoute';
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
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/carte" element={<CartePage />} />
            <Route path="/analyse" element={<PlaceholderPage title="Analyse multicritère" />} />
            <Route path="/alertes" element={<AlertesPage />} />
            <Route path="/donnees" element={<PlaceholderPage title="Gestion des données" />} />
            <Route path="/rapports" element={<PlaceholderPage title="Rapports" />} />
            <Route path="/parametres" element={<PlaceholderPage title="Paramètres" />} />
            <Route path="/utilisateurs" element={<PlaceholderPage title="Gestion des utilisateurs" />} />
            <Route path="/aide" element={<PlaceholderPage title="Aide" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
