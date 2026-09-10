import { Database, History, Sliders } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

export default function AnalyseNavTabs() {
  const location = useLocation();

  const links = [
    {
      to: '/analyse',
      label: 'Modèle AHP (Matrice de Saaty)',
      icon: Sliders,
      exact: true,
    },
    {
      to: '/analyse/solap',
      label: 'Explorateur SOLAP (Cube DWH)',
      icon: Database,
      exact: false,
    },
    {
      to: '/analyse/historique',
      label: 'Analyse Historique & Chronologie',
      icon: History,
      exact: false,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = link.exact
          ? location.pathname === link.to
          : location.pathname.startsWith(link.to);

        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={[
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all',
              isActive
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
            ].join(' ')}
          >
            <Icon size={15} />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
