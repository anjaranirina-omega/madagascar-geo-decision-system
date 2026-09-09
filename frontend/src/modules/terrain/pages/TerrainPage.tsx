import React, { useCallback, useEffect, useState } from 'react';
import {
  Radio,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  PlusCircle,
  RefreshCw,
  Navigation,
  Activity,
  ShieldAlert,
  Flame,
  FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';
import FieldReportForm from '../components/FieldReportForm';
import {
  InterventionItem,
  InterventionStatus,
  OperationalSignalItem,
  terrainService,
} from '../services/terrain.service';

const STATUS_BADGES: Record<InterventionStatus, { label: string; className: string }> = {
  PLANIFIEE: {
    label: 'Planifiée',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
  EN_COURS: {
    label: 'En cours',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  TERMINEE: {
    label: 'Terminée',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800',
  },
  ANNULEE: {
    label: 'Annulée',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

export default function TerrainPage() {
  const [activeTab, setActiveTab] = useState<'interventions' | 'signals' | 'new'>('interventions');
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [signals, setSignals] = useState<OperationalSignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [interventionsData, signalsData] = await Promise.all([
        terrainService.getInterventions().catch(() => []),
        terrainService.getOperationalSignals().catch(() => []),
      ]);
      setInterventions(interventionsData || []);
      setSignals(signalsData || []);
    } catch (err) {
      console.error('Erreur chargement données terrain:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (id: string, newStatus: InterventionStatus) => {
    try {
      await terrainService.updateIntervention(id, { statut: newStatus });
      setInterventions((prev) =>
        prev.map((it) => (it.id === id ? { ...it, statut: newStatus } : it)),
      );
    } catch (err) {
      console.error('Erreur mise à jour statut intervention:', err);
    }
  };

  const filteredInterventions = interventions.filter(
    (item) => !filterStatus || item.statut === filterStatus,
  );

  const stats = {
    planifiees: interventions.filter((i) => i.statut === 'PLANIFIEE').length,
    enCours: interventions.filter((i) => i.statut === 'EN_COURS').length,
    terminees: interventions.filter((i) => i.statut === 'TERMINEE').length,
    criticalSignals: signals.filter((s) => s.signalLevel === 'CRITIQUE' || s.signalLevel === 'ELEVE').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module Agent de Terrain & Interventions"
        subtitle="Collecte des observations terrain, suivi des missions d’intervention et veille opérationnelle géolocalisée."
        icon={<Radio size={32} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('new')}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
            >
              <PlusCircle size={15} />
              Nouveau rapport
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        }
      />

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Missions planifiées
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.planifiees}
          </div>
          <p className="mt-1 text-xs text-slate-500">En attente de déploiement</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Interventions en cours
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.enCours}
          </div>
          <p className="mt-1 text-xs text-slate-500">Actuellement sur le terrain</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Missions achevées
            </span>
            <div className="rounded-xl bg-green-50 p-2 text-green-600 dark:bg-green-950/50 dark:text-green-300">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-green-600 dark:text-green-400">
            {stats.terminees}
          </div>
          <p className="mt-1 text-xs text-slate-500">Rapports validés</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Signaux d'urgence
            </span>
            <div className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-950/50 dark:text-red-300">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">
            {stats.criticalSignals}
          </div>
          <p className="mt-1 text-xs text-slate-500">Zones en vigilance renforcée</p>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('interventions')}
            className={[
              'rounded-2xl px-4 py-2 text-xs font-black transition',
              activeTab === 'interventions'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            ].join(' ')}
          >
            Missions & Interventions ({interventions.length})
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={[
              'rounded-2xl px-4 py-2 text-xs font-black transition',
              activeTab === 'signals'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            ].join(' ')}
          >
            Signaux Opérationnels ({signals.length})
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={[
              'rounded-2xl px-4 py-2 text-xs font-black transition',
              activeTab === 'new'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            ].join(' ')}
          >
            + Saisie Rapport Terrain
          </button>
        </div>

        {activeTab === 'interventions' && (
          <div className="flex items-center gap-2">
            <ListFilter size={15} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">Tous les statuts</option>
              <option value="PLANIFIEE">Planifiée</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINEE">Terminée</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>
        )}
      </div>

      {/* Contenu de l'onglet actif */}
      {activeTab === 'new' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900 max-w-2xl mx-auto">
          <div className="mb-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Nouveau Rapport d'Intervention / Observation
            </h3>
            <p className="text-xs text-slate-500">
              Renseignez les constats terrain avec coordonnées GPS pour mise à jour immédiate du SIG de crise.
            </p>
          </div>
          <FieldReportForm
            onCreated={() => {
              loadData();
              setActiveTab('interventions');
            }}
          />
        </div>
      )}

      {activeTab === 'interventions' && (
        <div className="space-y-4">
          {filteredInterventions.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Aucune intervention terrain trouvée.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInterventions.map((item) => {
                const badge = STATUS_BADGES[item.statut] || STATUS_BADGES.PLANIFIEE;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                          {item.type}
                        </span>
                        <span
                          className={`rounded-xl border px-2.5 py-1 text-[11px] font-black ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 font-medium">
                          {item.description || 'Aucune description détaillée enregistrée.'}
                        </p>
                      </div>

                      {item.commune && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <MapPin size={14} className="text-purple-600 shrink-0" />
                          <span>Commune : {item.commune.nom}</span>
                        </div>
                      )}

                      {item.latitude && item.longitude && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                          <Navigation size={12} className="text-slate-400 shrink-0" />
                          <span>{item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.dateIntervention).toLocaleDateString('fr-FR')}
                      </span>

                      <div className="flex items-center gap-1">
                        {item.statut === 'PLANIFIEE' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'EN_COURS')}
                            className="rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300"
                          >
                            Démarrer
                          </button>
                        )}
                        {item.statut === 'EN_COURS' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'TERMINEE')}
                            className="rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-black text-green-700 hover:bg-green-100 dark:bg-green-950/60 dark:text-green-300"
                          >
                            Clôturer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="space-y-4">
          {signals.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Aucun signal opérationnel actif à ce jour.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {signals.map((sig) => (
                <div
                  key={sig.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      {sig.riskType} • {sig.zoneType}
                    </span>
                    <span
                      className={[
                        'rounded-xl px-2.5 py-1 text-[11px] font-black',
                        sig.signalLevel === 'CRITIQUE'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : sig.signalLevel === 'ELEVE'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                          : sig.signalLevel === 'MOYEN'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
                      ].join(' ')}
                    >
                      {sig.signalLevel} ({sig.signalScore.toFixed(1)}/100)
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {sig.zoneNom}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {sig.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
