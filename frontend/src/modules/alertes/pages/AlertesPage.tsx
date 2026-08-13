import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  Wand2,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import OperationalSignalsPanel from '../../operational-signals/components/OperationalSignalsPanel';
import {
  Alerte,
  AlerteNiveau,
  AlerteStatus,
  alertesService,
} from '../alertes.service';

const niveauLabels: Record<AlerteNiveau, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const niveauClasses: Record<AlerteNiveau, string> = {
  FAIBLE: 'bg-green-50 text-green-700 border-green-200',
  MOYEN: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ELEVE: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITIQUE: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AlerteStatus | 'ALL'>('ALL');
  const [zoneType, setZoneType] = useState('region');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAlertes = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await alertesService.findAll();
      setAlertes(data);
    } catch {
      setError('Impossible de charger les alertes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertes();
  }, []);

  const filteredAlertes = useMemo(() => {
    if (statusFilter === 'ALL') {
      return alertes;
    }

    return alertes.filter((alerte) => alerte.status === statusFilter);
  }, [alertes, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: alertes.length,
      active: alertes.filter((a) => a.status === 'ACTIVE').length,
      critical: alertes.filter((a) => a.niveau === 'CRITIQUE').length,
      resolved: alertes.filter((a) => a.status === 'RESOLUE').length,
    };
  }, [alertes]);

  const handleAutoGenerateWeatherRisk = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: any = await alertesService.autoGenerateWeatherRisk();
      setSuccess(result.message ?? 'Vérification météo-risque terminée.');
      await loadAlertes();
    } catch {
      setError('Impossible de générer les alertes météo-risque.');
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
      setSuccess('Alerte marquée comme résolue.');
      await loadAlertes();
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
      setSuccess('Alerte ignorée.');
      await loadAlertes();
    } catch {
      setError('Impossible d’ignorer cette alerte.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <ShieldAlert size={30} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Alertes climatiques
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Les alertes sont générées automatiquement à partir des niveaux de risque par zone, de la population exposée et des conditions météo récentes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={zoneType}
              onChange={(event) => setZoneType(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="region">Régions</option>
              <option value="district">Districts</option>
              <option value="commune">Communes</option>
            </select>

            <button
              onClick={loadAlertes}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button
              onClick={handleAutoGenerateWeatherRisk}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:scale-[1.01] disabled:opacity-60"
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="slate" />
        <StatCard label="Actives" value={stats.active} tone="orange" />
        <StatCard label="Critiques" value={stats.critical} tone="red" />
        <StatCard label="Résolues" value={stats.resolved} tone="green" />
      </div>

      <OperationalSignalsPanel />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as AlerteStatus | 'ALL')
          }
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actives</option>
          <option value="RESOLUE">Résolues</option>
          <option value="IGNOREE">Ignorées</option>
        </select>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-72 items-center justify-center text-slate-500">
            <RefreshCw className="mr-3 animate-spin" size={22} />
            Chargement des alertes...
          </div>
        ) : filteredAlertes.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-center">
            <AlertTriangle size={44} className="mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 dark:text-slate-200">
              Aucune alerte trouvée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Aucune alerte active pour le moment. Le système vérifie automatiquement les conditions de risque et de météo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
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
                    className="border-t border-slate-100 align-top transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-5 py-5">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {alerte.titre}
                      </div>
                      <div className="mt-1 max-w-md text-slate-500">
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
                        className={`rounded-full border px-3 py-1 text-xs font-extrabold ${niveauClasses[alerte.niveau]}`}
                      >
                        {niveauLabels[alerte.niveau]}
                      </span>
                    </td>

                    <td className="px-5 py-5 font-black text-slate-900 dark:text-white">
                      {typeof alerte.riskValue === 'number' ? alerte.riskValue.toFixed(1) : '—'} / 100
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

                    <td className="px-5 py-5 text-slate-500">
                      {formatDate(alerte.createdAt)}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-2">
                        {alerte.status === 'ACTIVE' ? (
                          <>
                            <button
                              onClick={() => handleResolve(alerte)}
                              disabled={actionLoading}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-600 px-3 text-xs font-extrabold text-white transition hover:bg-green-700 disabled:opacity-60"
                            >
                              <CheckCircle2 size={15} />
                              Résoudre
                            </button>

                            <button
                              onClick={() => handleIgnore(alerte)}
                              disabled={actionLoading}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-600 px-3 text-xs font-extrabold text-white transition hover:bg-slate-700 disabled:opacity-60"
                            >
                              <XCircle size={15} />
                              Ignorer
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Traitée
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
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
  const classes = {
    slate: 'bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
    orange: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    red: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    green: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
  };

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 dark:border-slate-800 ${classes[tone]}`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AlerteStatus }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700">
        <Clock size={14} />
        Active
      </span>
    );
  }

  if (status === 'RESOLUE') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700">
        <CheckCircle2 size={14} />
        Résolue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">
      <XCircle size={14} />
      Ignorée
    </span>
  );
}
