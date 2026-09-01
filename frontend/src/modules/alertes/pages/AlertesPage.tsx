import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Wand2,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Tabs from '../../../shared/components/ui/Tabs';
import OperationalSignalsPanel from '../../operational-signals/components/OperationalSignalsPanel';
import AlerteDetailDrawer from '../components/AlerteDetailDrawer';
import { useAlertsNotificationStore } from '../store/alerts-notification.store';
import {
  Alerte,
  AlerteNiveau,
  AlerteStatus,
  AlerteType,
  alertesService,
} from '../alertes.service';

type AlertesTab = 'alertes' | 'signals' | 'history';

const niveauLabels: Record<AlerteNiveau, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const niveauClasses: Record<AlerteNiveau, string> = {
  FAIBLE:
    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
  MOYEN:
    'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-900',
  ELEVE:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900',
  CRITIQUE:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
};

const typeLabels: Record<string, string> = {
  RISQUE_GLOBAL: 'Risque global',
  INONDATION: 'Inondation',
  CYCLONE: 'Cyclone',
  SECHERESSE: 'Sécheresse',
  GLISSEMENT_TERRAIN: 'Glissement de terrain',
  VENT_VIOLENT: 'Vent violent',
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Indian/Antananarivo',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatPopulation(value?: number) {
  if (!value || value <= 0) {
    return '—';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(Math.round(value));
}

export default function AlertesPage() {
  const [activeTab, setActiveTab] = useState<AlertesTab>('alertes');
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [zoneType, setZoneType] = useState('region');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtres P2
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AlerteType | 'ALL'>('ALL');
  const [niveauFilter, setNiveauFilter] = useState<AlerteNiveau | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlerteStatus | 'ALL'>('ALL');

  // Tiroir P3
  const [selectedAlerte, setSelectedAlerte] = useState<Alerte | null>(null);

  const loadAlertes = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await alertesService.findAll();
      setAlertes(data);
      useAlertsNotificationStore.getState().refresh();

      // Si une alerte était sélectionnée, actualiser ses données
      if (selectedAlerte) {
        const refreshed = data.find((a) => a.id === selectedAlerte.id);
        if (refreshed) {
          setSelectedAlerte(refreshed);
        }
      }
    } catch {
      setError('Impossible de charger les alertes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      typeFilter !== 'ALL' ||
      niveauFilter !== 'ALL' ||
      statusFilter !== 'ALL'
    );
  }, [searchQuery, typeFilter, niveauFilter, statusFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setNiveauFilter('ALL');
    setStatusFilter('ALL');
  };

  // Filtrage combiné (ET logique)
  const filteredAlertes = useMemo(() => {
    const baseList =
      activeTab === 'history'
        ? alertes.filter((alerte) =>
            ['RESOLUE', 'IGNOREE'].includes(alerte.status),
          )
        : alertes.filter((alerte) => alerte.status === 'ACTIVE');

    return baseList.filter((alerte) => {
      // 1. Filtre par recherche textuelle sur zoneNom
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const zoneNom = (alerte.zoneNom ?? '').toLowerCase();
        const titre = (alerte.titre ?? '').toLowerCase();

        if (!zoneNom.includes(query) && !titre.includes(query)) {
          return false;
        }
      }

      // 2. Filtre par type de risque
      if (typeFilter !== 'ALL' && alerte.type !== typeFilter) {
        return false;
      }

      // 3. Filtre par niveau / gravité
      if (niveauFilter !== 'ALL' && alerte.niveau !== niveauFilter) {
        return false;
      }

      // 4. Filtre par statut
      if (statusFilter !== 'ALL' && alerte.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [alertes, activeTab, searchQuery, typeFilter, niveauFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: alertes.length,
      active: alertes.filter((a) => a.status === 'ACTIVE').length,
      critical: alertes.filter((a) => a.niveau === 'CRITIQUE').length,
      resolved: alertes.filter((a) => a.status === 'RESOLUE').length,
    };
  }, [alertes]);

  // P1 : Appel corrigé vers POST /alertes/generate-from-risk
  const handleGenerateValidatedRiskAlerts = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: any = await alertesService.generateFromRisk({
        zoneType,
        thresholdEleve: 61,
        thresholdCritique: 81,
      });

      setSuccess(
        result.message ??
          'Vérification et génération des alertes validées terminées.',
      );

      await loadAlertes();
    } catch {
      setError('Impossible de générer les alertes validées.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateOperationalAlerts = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: any = await alertesService.generateOperationalAlerts({
        zoneType,
      });

      setSuccess(
        result.message ?? 'Génération des alertes opérationnelles terminée.',
      );

      await loadAlertes();
    } catch {
      setError('Impossible de générer les alertes opérationnelles.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (alerte: Alerte) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await alertesService.resolve(alerte.id);
      setSuccess(`Alerte pour ${alerte.zoneNom ?? 'la zone'} marquée comme résolue.`);
      await loadAlertes();
      if (selectedAlerte?.id === alerte.id) {
        setSelectedAlerte(null);
      }
    } catch {
      setError('Impossible de résoudre cette alerte.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIgnore = async (alerte: Alerte) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await alertesService.ignore(alerte.id);
      setSuccess(`Alerte pour ${alerte.zoneNom ?? 'la zone'} ignorée.`);
      await loadAlertes();
      if (selectedAlerte?.id === alerte.id) {
        setSelectedAlerte(null);
      }
    } catch {
      setError('Impossible d’ignorer cette alerte.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md">
              <ShieldAlert size={30} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Alertes climatiques
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Les alertes validées sont générées à partir des indicateurs zonaux
              réels et des signaux opérationnels temps réel. Cliquez sur une ligne
              pour ouvrir le tiroir d'analyse détaillée.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={zoneType}
              onChange={(event) => setZoneType(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="region">Régions</option>
              <option value="district">Districts</option>
              <option value="commune">Communes</option>
            </select>

            <button
              onClick={loadAlertes}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button
              onClick={handleGenerateValidatedRiskAlerts}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-red-900/10 transition hover:scale-[1.01] disabled:opacity-60"
            >
              <Wand2 size={18} />
              Vérifier maintenant
            </button>

            <button
              onClick={handleGenerateOperationalAlerts}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-purple-900/10 transition hover:scale-[1.01] disabled:opacity-60"
            >
              <Activity size={18} />
              Alertes opérationnelles
            </button>
          </div>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="slate" />
        <StatCard label="Actives" value={stats.active} tone="orange" />
        <StatCard label="Critiques" value={stats.critical} tone="red" />
        <StatCard label="Résolues" value={stats.resolved} tone="green" />
      </div>

      {/* Onglets */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'alertes',
            label: 'Alertes actives',
            count: alertes.filter((a) => a.status === 'ACTIVE').length,
          },
          {
            id: 'signals',
            label: 'Signaux opérationnels',
          },
          {
            id: 'history',
            label: 'Historique',
            count: alertes.filter((a) => ['RESOLUE', 'IGNOREE'].includes(a.status)).length,
          },
        ]}
      />

      {activeTab === 'signals' && <OperationalSignalsPanel />}

      {activeTab !== 'signals' && (
        <>
          {/* Barre de filtres et recherche interactive (P2) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Recherche textuelle sur zoneNom */}
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher une zone (ex: Analamanga)..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Filtre par type de risque */}
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as AlerteType | 'ALL')
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="ALL">Tous les types de risque</option>
                <option value="RISQUE_GLOBAL">Risque global</option>
                <option value="INONDATION">Inondation</option>
                <option value="CYCLONE">Cyclone</option>
                <option value="SECHERESSE">Sécheresse</option>
                <option value="GLISSEMENT_TERRAIN">Glissement de terrain</option>
                <option value="VENT_VIOLENT">Vent violent</option>
              </select>

              {/* Filtre par niveau / gravité */}
              <select
                value={niveauFilter}
                onChange={(event) =>
                  setNiveauFilter(event.target.value as AlerteNiveau | 'ALL')
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="ALL">Toutes les gravités</option>
                <option value="CRITIQUE">Critique</option>
                <option value="ELEVE">Élevé</option>
                <option value="MOYEN">Moyen</option>
                <option value="FAIBLE">Faible</option>
              </select>

              {/* Filtre par statut */}
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as AlerteStatus | 'ALL')
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIVE">Actives</option>
                <option value="RESOLUE">Résolues</option>
                <option value="IGNOREE">Ignorées</option>
              </select>
            </div>

            {/* Barre de résumé des filtres & Réinitialisation */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Filter size={14} className="text-slate-400" />
                <span>
                  {filteredAlertes.length} alerte(s) affichée(s)
                </span>
                {hasActiveFilters && (
                  <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-300">
                    Filtres actifs
                  </span>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RotateCcw size={13} />
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                {success}
              </div>
            )}
          </div>

          {/* Tableau des alertes (avec lignes cliquables P3) */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="flex h-72 items-center justify-center text-slate-500 dark:text-slate-400">
                <RefreshCw className="mr-3 animate-spin" size={22} />
                Chargement des alertes...
              </div>
            ) : filteredAlertes.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center text-center">
                <AlertTriangle size={44} className="mb-3 text-slate-300" />
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  Aucune alerte trouvée
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {hasActiveFilters
                    ? 'Aucune alerte ne correspond aux critères de filtre sélectionnés.'
                    : 'Aucune alerte enregistrée pour cette vue.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <RotateCcw size={14} />
                    Effacer les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Alerte</th>
                      <th className="px-5 py-4">Zone</th>
                      <th className="px-5 py-4">Niveau</th>
                      <th className="px-5 py-4">Risque max</th>
                      <th className="px-5 py-4">Population exposée</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAlertes.map((alerte) => (
                      <tr
                        key={alerte.id}
                        onClick={() => setSelectedAlerte(alerte)}
                        className={[
                          'cursor-pointer border-t border-slate-100 align-top transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60',
                          selectedAlerte?.id === alerte.id
                            ? 'bg-red-50/40 dark:bg-red-950/20'
                            : '',
                        ].join(' ')}
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {alerte.titre}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {typeLabels[alerte.type] ?? alerte.type}
                            </span>
                          </div>
                          <div className="mt-1 max-w-md line-clamp-2 text-slate-500 dark:text-slate-400">
                            {alerte.message}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {alerte.zoneNom ?? 'Zone non définie'}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {alerte.zoneType ?? '—'}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={[
                              'rounded-full border px-3 py-1 text-xs font-extrabold',
                              niveauClasses[alerte.niveau],
                            ].join(' ')}
                          >
                            {niveauLabels[alerte.niveau]}
                          </span>
                        </td>

                        <td className="px-5 py-5 font-black text-slate-900 dark:text-white">
                          {typeof alerte.riskValue === 'number'
                            ? alerte.riskValue.toFixed(1)
                            : '—'}{' '}
                          / 100

                          {typeof alerte.riskMean === 'number' && (
                            <div className="text-xs font-normal text-slate-500">
                              Moyenne {alerte.riskMean.toFixed(1)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-5 font-semibold text-slate-700 dark:text-slate-200">
                          {formatPopulation(alerte.populationExposed ?? undefined)}
                        </td>

                        <td className="px-5 py-5">
                          <StatusBadge status={alerte.status} />
                        </td>

                        <td className="px-5 py-5 text-slate-500 dark:text-slate-400">
                          {formatDate(alerte.createdAt)}
                        </td>

                        <td className="px-5 py-5">
                          {alerte.status === 'ACTIVE' ? (
                            <div
                              className="flex justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleResolve(alerte)}
                                disabled={actionLoading}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-green-600 px-3 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                              >
                                <CheckCircle2 size={15} />
                                Résoudre
                              </button>

                              <button
                                onClick={() => handleIgnore(alerte)}
                                disabled={actionLoading}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-700 px-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                              >
                                <XCircle size={15} />
                                Ignorer
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex justify-end text-xs text-slate-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                Détail →
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tiroir latéral de détail d'alerte (P3) */}
      <AlerteDetailDrawer
        alerte={selectedAlerte}
        onClose={() => setSelectedAlerte(null)}
        onResolve={handleResolve}
        onIgnore={handleIgnore}
        actionLoading={actionLoading}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: AlerteStatus }) {
  const labels: Record<AlerteStatus, string> = {
    ACTIVE: 'Active',
    RESOLUE: 'Résolue',
    IGNOREE: 'Ignorée',
  };

  const classes: Record<AlerteStatus, string> = {
    ACTIVE:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900',
    RESOLUE:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
    IGNOREE:
      'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <span
      className={[
        'rounded-full border px-3 py-1 text-xs font-extrabold',
        classes[status],
      ].join(' ')}
    >
      {labels[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'orange' | 'red' | 'green';
}) {
  const tones = {
    slate:
      'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white',
    orange:
      'border-orange-100 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100',
    red:
      'border-red-100 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
    green:
      'border-green-100 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100',
  };

  return (
    <div className={['rounded-3xl border p-5 shadow-soft', tones[tone]].join(' ')}>
      <div className="text-sm font-bold opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}
