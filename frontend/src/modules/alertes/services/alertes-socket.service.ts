import { io, Socket } from 'socket.io-client';
import { Alerte } from '../alertes.service';
import { useAlertsNotificationStore } from '../store/alerts-notification.store';

let socket: Socket | null = null;

type AlertListener = (alert: Alerte) => void;
const alertListeners: Set<AlertListener> = new Set();

export function getAlertsSocketUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/api\/?$/, '');
  }

  return 'http://localhost:3001';
}

export function disconnectAlertsSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function initializeAlertsSocket(onAlertReceived?: AlertListener): () => void {
  if (onAlertReceived) {
    alertListeners.add(onAlertReceived);
  }

  const token = localStorage.getItem('accessToken');
  if (!token) {
    return () => {
      if (onAlertReceived) {
        alertListeners.delete(onAlertReceived);
      }
    };
  }

  if (!socket) {
    const url = getAlertsSocketUrl();

    socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        cb({
          token: localStorage.getItem('accessToken') || '',
        });
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 6000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      // Connecté et authentifié avec succès
    });

    socket.on('alert', (alertData: Alerte) => {
      // 1. Déclencher un rafraîchissement immédiat du store de notification
      useAlertsNotificationStore.getState().refresh();

      // 2. Notifier tous les écouteurs enregistrés (pour les toasts visuels)
      alertListeners.forEach((listener) => {
        try {
          listener(alertData);
        } catch (err) {
          console.warn('[AlertsSocket] Erreur lors de l’exécution d’un listener:', err);
        }
      });
    });

    socket.on('connect_error', () => {
      // Dégradation gracieuse silencieuse vers le polling périodique en cas de coupure
    });
  }

  return () => {
    if (onAlertReceived) {
      alertListeners.delete(onAlertReceived);
    }
  };
}
