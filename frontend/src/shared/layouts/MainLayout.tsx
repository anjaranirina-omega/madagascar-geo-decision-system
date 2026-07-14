import {
  AlertTriangle,
  BarChart3,
  Bell,
  CloudSun,
  Database,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Map,
  Settings,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { authService } from '../../modules/auth/auth.service';

const menu = [
  { label: 'Tableau de bord', path: '/', icon: Home },
  { label: 'Carte des risques', path: '/carte', icon: Map },
  { label: 'Analyses', path: '/analyse', icon: BarChart3 },
  { label: 'Alertes', path: '/alertes', icon: AlertTriangle },
  { label: 'Données', path: '/donnees', icon: Database },
  { label: 'Rapports', path: '/rapports', icon: FileText },
  { label: 'Paramètres', path: '/parametres', icon: Settings },
  { label: 'Utilisateurs', path: '/utilisateurs', icon: Users },
  { label: 'Aide', path: '/aide', icon: HelpCircle },
];

const titles: Record<string, string> = {
  '/': 'Tableau de bord',
  '/carte': 'Carte des risques',
  '/analyse': 'Analyse multicritère',
  '/alertes': 'Alertes',
  '/donnees': 'Gestion des données',
  '/rapports': 'Rapports',
  '/parametres': 'Paramètres',
  '/utilisateurs': 'Gestion des utilisateurs',
  '/aide': 'Aide',
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore((state) => state.user);
  const clearAuth = useAppStore((state) => state.clearAuth);

  const pageTitle = titles[location.pathname] ?? 'RISKLIM-MG';

  const handleLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-riskbg">
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-riskdark text-white">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-sky-400">
              <CloudSun size={25} />
            </div>
            <div>
              <div className="text-lg font-black leading-none">RISKLIM-MG</div>
              <div className="text-xs text-slate-300">Géodécisionnel</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    isActive
                      ? 'sidebar-link sidebar-link-active'
                      : 'sidebar-link'
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="sidebar-link mt-4 border-0 bg-transparent text-left"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-5">
            <div className="text-right text-xs text-slate-500">
              <div className="font-bold text-slate-700">18 Juin 2026</div>
              <div>10:30:45</div>
            </div>

            <button className="relative rounded-full p-2 hover:bg-slate-100">
              <Bell size={20} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">
                {user?.firstName?.[0] ?? 'A'}
              </div>
              <div className="text-sm">
                <div className="font-bold">
                  {user?.firstName ?? 'Admin'}
                </div>
                <div className="text-xs text-slate-500">
                  {user?.role?.name ?? 'Administrateur'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
