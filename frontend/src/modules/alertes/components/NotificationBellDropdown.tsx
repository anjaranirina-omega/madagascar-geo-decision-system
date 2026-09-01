import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlertsNotificationStore } from '../store/alerts-notification.store';
import { AlerteNiveau } from '../alertes.service';

const niveauBadges: Record<AlerteNiveau, { label: string; class: string }> = {
  CRITIQUE: {
    label: 'Critique',
    class: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
  },
  ELEVE: {
    label: 'Élevé',
    class: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900',
  },
  MOYEN: {
    label: 'Moyen',
    class: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-900',
  },
  FAIBLE: {
    label: 'Faible',
    class: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-900',
  },
};

function formatShortDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationBellDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    highPriorityAlerts,
    highPriorityCount,
    criticalCount,
    loading,
    refresh,
  } = useAlertsNotificationStore();

  // Polling automatique 60s
  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60_000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const previewAlerts = highPriorityAlerts.slice(0, 5);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
          open ? 'bg-slate-100 dark:bg-slate-800' : '',
        ].join(' ')}
        aria-label="Centre de notifications d’alertes"
        title="Notifications d’alertes"
      >
        <Bell size={23} />

        {highPriorityCount > 0 && (
          <span
            className={[
              'absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-white shadow-sm transition',
              criticalCount > 0
                ? 'bg-red-500 animate-pulse'
                : 'bg-orange-500',
            ].join(' ')}
          >
            {highPriorityCount > 99 ? '99+' : highPriorityCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/98">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-2 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={19} />
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  Alertes prioritaires
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {highPriorityCount > 0
                    ? `${highPriorityCount} alerte(s) critique(s) ou élevée(s)`
                    : 'Aucune alerte urgente en cours'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              disabled={loading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Rafraîchir les alertes"
            >
              <RefreshCw
                size={15}
                className={loading ? 'animate-spin text-blue-500' : ''}
              />
            </button>
          </div>

          {/* Alert list */}
          <div className="my-2 max-h-80 space-y-2 overflow-y-auto pr-1">
            {previewAlerts.length > 0 ? (
              previewAlerts.map((alerte) => {
                const badge =
                  niveauBadges[alerte.niveau] ?? niveauBadges.ELEVE;

                return (
                  <button
                    key={alerte.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/alertes');
                    }}
                    className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={[
                              'rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                              badge.class,
                            ].join(' ')}
                          >
                            {badge.label}
                          </span>
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {alerte.zoneNom ?? 'Madagascar'}
                          </span>
                        </div>

                        <div className="mt-1 line-clamp-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {alerte.titre}
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-semibold text-slate-400 shrink-0">
                        {typeof alerte.riskValue === 'number' && (
                          <div className="font-black text-slate-800 dark:text-slate-200">
                            {alerte.riskValue.toFixed(0)}/100
                          </div>
                        )}
                        <div>{formatShortDate(alerte.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                  <CheckCircle2 size={22} />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Situation sous contrôle
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Aucune alerte active de niveau critique ou élevé.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/alertes');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <AlertTriangle size={14} />
              <span>Voir toutes les alertes</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
