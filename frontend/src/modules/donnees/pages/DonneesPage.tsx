import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  PlayCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DataSourceItem,
  dataSourcesFrontendService,
} from '../services/data-sources.service';
import {
  EtlRiskPipelineResponse,
  etlFrontendService,
} from '../services/etl.service';

function extractPipelineErrorMessage(error: unknown) {
  const maybeAxiosError = error as {
    response?: {
      data?: {
        message?: string;
        detail?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return (
    maybeAxiosError.response?.data?.message ??
    maybeAxiosError.response?.data?.detail ??
    maybeAxiosError.response?.data?.error ??
    maybeAxiosError.message ??
    null
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Non disponible';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusLabel(status: DataSourceItem['status']) {
  switch (status) {
    case 'CONNECTED':
      return 'Connecté';
    case 'PENDING':
      return 'En attente';
    case 'FAILED':
      return 'Erreur';
    case 'DISABLED':
      return 'Désactivé';
    default:
      return status;
  }
}

function getStatusClasses(status: DataSourceItem['status']) {
  switch (status) {
    case 'CONNECTED':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'PENDING':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'DISABLED':
      return 'border-slate-200 bg-slate-50 text-slate-500';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function getStatusIcon(status: DataSourceItem['status']) {
  switch (status) {
    case 'CONNECTED':
      return <CheckCircle2 size={17} />;
    case 'PENDING':
      return <Clock size={17} />;
    case 'FAILED':
      return <AlertCircle size={17} />;
    case 'DISABLED':
      return <WifiOff size={17} />;
    default:
      return <Database size={17} />;
  }
}

export default function DonneesPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EtlRiskPipelineResponse | null>(null);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState('');

  const loadSources = async () => {
    setSourcesLoading(true);
    setSourcesError('');

    try {
      const response = await dataSourcesFrontendService.findAll();

      setSources(response);
    } catch (sourceError) {
      console.error('[DonneesPage] Erreur chargement sources:', sourceError);
      setSourcesError('Impossible de charger le statut des sources de données.');
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const runPipeline = async () => {
    setRunning(true);
    setError('');
    setResult(null);

    try {
      const response = await etlFrontendService.runRiskPipeline();

      setResult(response);
      await loadSources();
    } catch (pipelineError) {
      console.error('[DonneesPage] Erreur pipeline ETL:', pipelineError);

      const message = extractPipelineErrorMessage(pipelineError);

      setError(
        message
          ? `Impossible d’exécuter le pipeline de risque : ${message}`
          : 'Impossible d’exécuter le pipeline de risque.',
      );

      await loadSources();
    } finally {
      setRunning(false);
    }
  };

  const connectedCount = sources.filter(
    (source) => source.status === 'CONNECTED',
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <Database size={30} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Gestion des données
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Lancez le pipeline automatique pour synchroniser CHIRPS, recalculer
              le risque global, recalculer le risque inondation et mettre à jour
              les métadonnées raster.
            </p>
          </div>

          <button
            type="button"
            onClick={runPipeline}
            disabled={running}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <PlayCircle size={20} />
            )}

            {running ? 'Pipeline en cours...' : 'Lancer le pipeline de risque'}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Sources de données
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Suivi des sources utilisées par les modèles de risque.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700">
              {connectedCount}/{sources.length || 0} connectées
            </span>

            <button
              type="button"
              onClick={loadSources}
              disabled={sourcesLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={sourcesLoading ? 'animate-spin' : ''}
              />
              Actualiser
            </button>
          </div>
        </div>

        {sourcesError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {sourcesError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-slate-800"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {source.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {source.provider ?? source.category}
                  </div>
                </div>

                <span
                  className={[
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold',
                    getStatusClasses(source.status),
                  ].join(' ')}
                >
                  {getStatusIcon(source.status)}
                  {getStatusLabel(source.status)}
                </span>
              </div>

              <p className="line-clamp-3 text-sm leading-5 text-slate-500">
                {source.description}
              </p>

              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <div>
                  <span className="font-bold text-slate-700">
                    Dernière réussite :
                  </span>{' '}
                  {formatDateTime(source.lastSuccessAt)}
                </div>

                <div>
                  <span className="font-bold text-slate-700">
                    Dernière synchronisation :
                  </span>{' '}
                  {formatDateTime(source.lastSyncAt)}
                </div>

                {source.lastErrorMessage && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-700">
                    {source.lastErrorMessage}
                  </div>
                )}
              </div>
            </div>
          ))}

          {!sourcesLoading && sources.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Aucune source de données enregistrée.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Résultat du pipeline
          </h3>

          <p className="mt-2 text-sm font-semibold text-green-700">
            {result.message}
          </p>

          {result.alertSkipped && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              Les alertes n’ont pas été générées par ce pipeline. Cette étape est
              volontairement désactivée pour éviter toute alerte non validée.
            </div>
          )}

          {result.alertWarning && (
            <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
              Pipeline exécuté, mais la vérification météo-risque n’a pas pu être
              terminée :
              <br />
              {result.alertWarning}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {result.steps.map((step) => (
              <div
                key={step.name}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {step.name}
                    </div>

                    <div className="text-xs text-slate-500">{step.script}</div>
                  </div>

                  <span
                    className={
                      step.status === 'SUCCESS'
                        ? 'rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700'
                        : 'rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700'
                    }
                  >
                    {step.status}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Durée : {(step.durationMs / 1000).toFixed(1)} s
                </div>

                {step.error && (
                  <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {step.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
