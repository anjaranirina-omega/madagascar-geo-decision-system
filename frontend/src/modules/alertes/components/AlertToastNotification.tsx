import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alerte } from '../alertes.service';
import { initializeAlertsSocket } from '../services/alertes-socket.service';

interface ToastAlert {
  id: string;
  titre: string;
  zoneNom?: string;
  niveau: string;
  riskValue?: number;
  timestamp: number;
}

export default function AlertToastNotification() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  useEffect(() => {
    const unsubscribe = initializeAlertsSocket((alert: Alerte) => {
      // Afficher un toast pour les nouvelles alertes de niveau CRITIQUE ou ELEVE
      if (
        alert.status === 'ACTIVE' &&
        (alert.niveau === 'CRITIQUE' || alert.niveau === 'ELEVE')
      ) {
        const newToast: ToastAlert = {
          id: `${alert.id}-${Date.now()}`,
          titre: alert.titre,
          zoneNom: alert.zoneNom,
          niveau: alert.niveau,
          riskValue: alert.riskValue,
          timestamp: Date.now(),
        };

        setToasts((prev) => [newToast, ...prev.slice(0, 2)]);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => Date.now() - t.timestamp < 6000));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-5 top-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isCritique = toast.niveau === 'CRITIQUE';

        return (
          <div
            key={toast.id}
            className={[
              'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4',
              isCritique
                ? 'border-red-300 bg-red-500/95 text-white dark:border-red-800 dark:bg-red-950/95'
                : 'border-orange-300 bg-orange-500/95 text-white dark:border-orange-800 dark:bg-orange-950/95',
            ].join(' ')}
          >
            <div className="mt-0.5 rounded-xl bg-white/20 p-2 text-white shrink-0">
              {isCritique ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  {toast.niveau}
                </span>
                <span className="text-xs font-bold opacity-90 truncate">
                  {toast.zoneNom ?? 'Madagascar'}
                </span>
              </div>

              <div className="mt-1 text-sm font-black line-clamp-1">
                {toast.titre}
              </div>

              {typeof toast.riskValue === 'number' && (
                <div className="mt-0.5 text-xs opacity-85">
                  Score de risque : {toast.riskValue.toFixed(1)}/100
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  removeToast(toast.id);
                  navigate('/alertes');
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-black underline underline-offset-2 hover:opacity-90"
              >
                <span>Accéder à l'alerte</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition shrink-0"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
