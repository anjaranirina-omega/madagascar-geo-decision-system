import { create } from 'zustand';
import { Alerte, alertesService } from '../alertes.service';

type AlertsNotificationState = {
  activeAlerts: Alerte[];
  highPriorityAlerts: Alerte[];
  criticalCount: number;
  highPriorityCount: number;
  loading: boolean;
  lastFetchedAt: Date | null;
  refresh: () => Promise<void>;
};

export const useAlertsNotificationStore = create<AlertsNotificationState>((set) => ({
  activeAlerts: [],
  highPriorityAlerts: [],
  criticalCount: 0,
  highPriorityCount: 0,
  loading: false,
  lastFetchedAt: null,

  refresh: async () => {
    set({ loading: true });
    try {
      const activeAlerts = await alertesService.findActive();

      // Filtrer les alertes prioritaires : CRITIQUE ou ELEVE
      const highPriorityAlerts = activeAlerts.filter(
        (a) => a.niveau === 'CRITIQUE' || a.niveau === 'ELEVE',
      );

      // Trier : d'abord CRITIQUE puis ELEVE, ensuite par date décroissante
      highPriorityAlerts.sort((a, b) => {
        if (a.niveau === 'CRITIQUE' && b.niveau !== 'CRITIQUE') return -1;
        if (a.niveau !== 'CRITIQUE' && b.niveau === 'CRITIQUE') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const criticalCount = activeAlerts.filter((a) => a.niveau === 'CRITIQUE').length;
      const highPriorityCount = highPriorityAlerts.length;

      set({
        activeAlerts,
        highPriorityAlerts,
        criticalCount,
        highPriorityCount,
        loading: false,
        lastFetchedAt: new Date(),
      });
    } catch (error) {
      console.error('[AlertsNotificationStore] Erreur chargement alertes actives:', error);
      set({ loading: false });
    }
  },
}));
