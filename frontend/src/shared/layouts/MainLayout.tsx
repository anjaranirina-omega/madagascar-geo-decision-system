import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CloudRain,
  Database,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Map,
  Menu,
  Moon,
  Settings,
  Sun,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { authService } from '../../modules/auth/auth.service';

const menu = [
  { label: 'Tableau de bord', path: '/', icon: Home },
  { label: 'Carte des risques', path: '/carte', icon: Map },
  { label: 'Analyse multicritère', path: '/analyse', icon: BarChart3 },
  { label: 'Alertes', path: '/alertes', icon: AlertTriangle, badge: 8 },
  { label: 'Données', path: '/donnees', icon: Database },
  { label: 'Rapports', path: '/rapports', icon: FileText },
  { label: 'Paramètres', path: '/parametres', icon: Settings },
  { label: 'Utilisateurs', path: '/utilisateurs', icon: Users },
  { label: 'Demandes de compte', path: '/demandes-comptes', icon: UserCheck },
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
  '/demandes-comptes': 'Demandes de compte',
  '/aide': 'Aide',
};

const subtitles: Record<string, string> = {
  '/': 'Vue d’ensemble des risques climatiques à Madagascar',
  '/carte': 'Visualisation spatiale des risques et couches raster',
  '/analyse': 'Pondération des critères et analyse multicritère',
  '/alertes': 'Suivi des alertes climatiques et zones critiques',
  '/donnees': 'Sources, imports et qualité des données',
  '/rapports': 'Rapports décisionnels et exports',
  '/parametres': 'Configuration générale de la plateforme',
  '/utilisateurs': 'Gestion des comptes et rôles',
  '/demandes-comptes': 'Validation des demandes d’accès',
  '/aide': 'Documentation et assistance utilisateur',
};

function formatDateTime(date: Date) {
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);

  return {
    formattedDate,
    formattedTime,
  };
}


export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore((state) => state.user);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const { formattedDate, formattedTime } = formatDateTime(currentDate);

  const pageTitle = titles[location.pathname] ?? 'RISKCLIM-MG';
  const pageSubtitle = subtitles[location.pathname] ?? 'Plateforme géodécisionnelle';

  const handleLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 w-[290px] overflow-hidden bg-[#061827] text-white shadow-2xl shadow-slate-900/20">
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] bg-cover bg-center opacity-45"
          style={{
            backgroundImage: 'url("/images/sidebar-risk-bg.png")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061827] via-[#071b2e]/96 to-[#061827]/86" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#061827] via-[#061827]/70 to-transparent" />

        <div className="relative z-10 flex h-full flex-col px-4 py-5">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 shadow-lg shadow-blue-950/30">
              <CloudRain size={27} />
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">
                RISK<span className="text-blue-400">CLIM</span>
                <span className="text-green-400">-MG</span>
              </div>
              <div className="text-xs font-medium text-slate-300">
                Géodécisionnel
              </div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    [
                      'group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-lg shadow-green-950/20'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </span>

                  {item.badge && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/8 p-3 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-800">
                {user?.firstName?.[0] ?? 'A'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-white">
                  {user?.firstName ?? 'Admin'}
                </div>
                <div className="flex items-center gap-1 text-xs text-green-300">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  {user?.role?.name ?? 'Administrateur'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={19} />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-[290px] min-h-screen dark:text-slate-100">
        <header className="sticky top-0 z-30 flex h-[96px] items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex items-center gap-6">
            <button
              className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Menu"
            >
              <Menu size={26} />
            </button>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {pageTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pageSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-3 text-right text-sm text-slate-700 md:flex">
              <CalendarDays size={22} />
              <div>
                <div className="font-extrabold dark:text-slate-200">{formattedDate}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{formattedTime}</div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {theme === 'dark' ? <Sun size={23} /> : <Moon size={23} />}
            </button>

            <button
              className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell size={23} />
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                8
              </span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800">
                {user?.firstName?.[0] ?? 'A'}
              </div>

              <div className="hidden text-sm md:block dark:text-slate-100">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {user?.firstName ?? 'Admin'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.role?.name ?? 'Administrateur'}
                </div>
              </div>

              <ChevronDown size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        </header>

        <section className="p-8">
          <Outlet />
        </section>

        <footer className="flex items-center justify-between px-8 pb-6 text-sm text-slate-500 dark:text-slate-400">
          <div>
            © 2026 RISKCLIM-MG • Système d’aide à la décision climatique géospatialisé en temps réel
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={17} />
            Plateforme sécurisée
          </div>
        </footer>
      </main>
    </div>
  );
}
