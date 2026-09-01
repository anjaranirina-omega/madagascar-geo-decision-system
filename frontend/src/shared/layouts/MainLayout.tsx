import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
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
  X,
  Settings,
  Sun,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { authService } from '../../modules/auth/auth.service';
import { useAlertsNotificationStore } from '../../modules/alertes/store/alerts-notification.store';
import NotificationBellDropdown from '../../modules/alertes/components/NotificationBellDropdown';
import { AppRole, normalizeRole, PAGE_ACCESS } from '../auth/roles';

type MenuItem = {
  label: string;
  path: string;
  icon: typeof Home;
  allowedRoles: AppRole[];
};

const menu: MenuItem[] = [
  { label: 'Tableau de bord', path: '/dashboard', icon: Home, allowedRoles: PAGE_ACCESS.dashboard },
  { label: 'Carte des risques', path: '/carte', icon: Map, allowedRoles: PAGE_ACCESS.carte },
  { label: 'Analyse multicritère', path: '/analyse', icon: BarChart3, allowedRoles: PAGE_ACCESS.analyse },
  { label: 'Alertes', path: '/alertes', icon: AlertTriangle, allowedRoles: PAGE_ACCESS.alertes },
  { label: 'Données', path: '/donnees', icon: Database, allowedRoles: PAGE_ACCESS.donnees },
  { label: 'Rapports', path: '/rapports', icon: FileText, allowedRoles: PAGE_ACCESS.rapports },
  { label: 'Paramètres', path: '/parametres', icon: Settings, allowedRoles: PAGE_ACCESS.parametres },
  { label: 'Utilisateurs', path: '/utilisateurs', icon: Users, allowedRoles: PAGE_ACCESS.utilisateurs },
  { label: 'Demandes de compte', path: '/demandes-comptes', icon: UserCheck, allowedRoles: PAGE_ACCESS.demandesComptes },
  { label: 'Aide', path: '/aide', icon: HelpCircle, allowedRoles: PAGE_ACCESS.aide },
];

const titles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/carte': 'Carte des risques',
  '/analyse': 'Analyse multicritère',
  '/alertes': 'Alertes',
  '/donnees': 'Gestion des données',
  '/rapports': 'Rapports',
  '/parametres': 'Paramètres',
  '/utilisateurs': 'Gestion des utilisateurs',
  '/demandes-comptes': 'Demandes de compte',
  '/aide': 'Aide',
  '/acces-refuse': 'Accès refusé',
};

const subtitles: Record<string, string> = {
  '/dashboard': 'Vue d’ensemble des risques climatiques à Madagascar',
  '/carte': 'Visualisation spatiale des risques et couches raster',
  '/analyse': 'Pondération des critères et analyse multicritère',
  '/alertes': 'Suivi des alertes climatiques et zones critiques',
  '/donnees': 'Sources, imports et qualité des données',
  '/rapports': 'Rapports décisionnels et exports',
  '/parametres': 'Configuration générale de la plateforme',
  '/utilisateurs': 'Gestion des comptes et rôles',
  '/demandes-comptes': 'Validation des demandes d’accès',
  '/aide': 'Documentation et assistance utilisateur',
  '/acces-refuse': 'Vous n’avez pas les permissions nécessaires pour cette section.',
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const highPriorityAlertsCount = useAlertsNotificationStore(
    (state) => state.highPriorityCount,
  );
  const criticalAlertsCount = useAlertsNotificationStore(
    (state) => state.criticalCount,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const { formattedDate, formattedTime } = formatDateTime(currentDate);

  const pageTitle = titles[location.pathname] ?? 'RISKCLIM-MG';
  const pageSubtitle = subtitles[location.pathname] ?? 'Plateforme géodécisionnelle';
  const userRole = normalizeRole(user?.role?.name);
  const visibleMenu = menu.filter((item) => userRole && item.allowedRoles.includes(userRole));

  useEffect(() => {
    setUserMenuOpen(false);
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleSidebarToggle = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if (isDesktop) {
      setSidebarCollapsed((value) => !value);
      return;
    }

    setMobileSidebarOpen((value) => !value);
  };

  const handleLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef6ff_0,#f8fafc_38%,#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a_0,#020617_45%,#000814_100%)]">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-[290px] max-w-[86vw] transform overflow-hidden bg-[#061827] text-white shadow-2xl shadow-slate-900/20 transition-all duration-300 lg:max-w-none lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-[92px]' : 'lg:w-[290px]',
        ].join(' ')}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] bg-cover bg-center opacity-45"
          style={{
            backgroundImage: 'url("/images/sidebar-risk-bg.webp")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061827] via-[#071b2e]/96 to-[#061827]/86" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#061827] via-[#061827]/70 to-transparent" />

        <div className="relative z-10 flex h-full flex-col px-4 py-5">
          <div className="mb-8 flex items-center justify-between gap-3 px-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 shadow-lg shadow-blue-950/30">
                <CloudRain size={27} />
              </div>

              {!sidebarCollapsed && (
                <div className={sidebarCollapsed ? "hidden" : "min-w-0"}>
                  <div className="truncate text-xl font-black tracking-tight">
                    RISK<span className="text-blue-400">CLIM</span>
                    <span className="text-green-400">-MG</span>
                  </div>
                  <div className="text-xs font-medium text-slate-300">
                    Géodécisionnel
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-xl p-2 text-slate-200 transition hover:bg-white/10 lg:hidden"
              aria-label="Fermer le menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {visibleMenu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileSidebarOpen(false)}
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
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </span>

                  {highPriorityAlertsCount > 0 && item.path === '/alertes' && (
                    <span
                      className={[
                        'flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black text-white shadow-sm',
                        criticalAlertsCount > 0 ? 'bg-red-500' : 'bg-orange-500',
                      ].join(' ')}
                    >
                      {highPriorityAlertsCount > 99 ? '99+' : highPriorityAlertsCount}
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

              <div className={sidebarCollapsed ? "hidden" : "min-w-0 flex-1"}>
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
              {!sidebarCollapsed && 'Déconnexion'}
            </button>
          </div>
        </div>
      </aside>

      <main
        className={[
          'min-h-screen min-w-0 text-slate-900 transition-all duration-300 dark:text-slate-100',
          sidebarCollapsed ? 'lg:ml-[92px]' : 'lg:ml-[290px]',
        ].join(' ')}
      >
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 sm:px-6 lg:h-[96px] lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:gap-6">
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Menu"
            >
              <Menu size={26} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl lg:text-3xl">
                {pageTitle}
              </h1>
              <p className="mt-1 hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">{pageSubtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-6">
            <div className="hidden items-center gap-3 text-right text-sm text-slate-700 md:flex">
              <CalendarDays size={22} />
              <div>
                <div className="font-extrabold ">{formattedDate}</div>
                <div className="text-xs text-slate-500 ">{formattedTime}</div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {theme === 'dark' ? <Sun size={23} /> : <Moon size={23} />}
            </button>

            <NotificationBellDropdown />

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((value) => !value)}
                className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800 sm:h-12 sm:w-12">
                  {user?.firstName?.[0] ?? 'A'}
                </div>

                <div className="hidden text-sm md:block">
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {user?.firstName ?? 'Admin'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.role?.name ?? 'Administrateur'}
                  </div>
                </div>

                <ChevronDown size={18} className="text-slate-500 dark:text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/utilisateurs');
                    }}
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Profil / utilisateurs
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/parametres');
                    }}
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Paramètres
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    {!sidebarCollapsed && 'Déconnexion'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </section>

        <footer className="flex flex-col items-start justify-between gap-3 px-4 pb-6 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center lg:px-8">
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
