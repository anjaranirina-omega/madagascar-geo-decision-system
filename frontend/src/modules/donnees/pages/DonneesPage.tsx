import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CloudSun,
  Database,
  PlayCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Tabs from '../../../shared/components/ui/Tabs';
import {
  ClimateSyncResponse,
  climateFrontendService,
} from '../services/climate.service';
import {
  DataSourceItem,
  dataSourcesFrontendService,
} from '../services/data-sources.service';
import {
  EtlPipelineJob,
  EtlRiskPipelineResponse,
  etlFrontendService,
} from '../services/etl.service';

type DonneesTab = 'pipeline' | 'sources' | 'climate' | 'jobs';

function extractErrorMessage(error: unknown) {
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Non disponible';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Indian/Antananarivo',
  }).format(new Date(value));
}

function getStatusLabel(status: DataSourceItem['status'] | string) {
  switch (status) {
    case 'CONNECTED':
      return 'Connecté';
    case 'PENDING':
      return 'En attente';
    case 'FAILED':
      return 'Erreur';
    case 'DISABLED':
      return 'Désactivé';
    case 'SUCCESS':
      return 'Succès';
    case 'RUNNING':
      return 'En cours';
    default:
      return status;
  }
}

function getStatusClasses(status: DataSourceItem['status'] | string) {
  switch (status) {
    case 'CONNECTED':
    case 'SUCCESS':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200';
    case 'PENDING':
    case 'RUNNING':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200';
    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200';
    case 'DISABLED':
      return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
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
  const [activeTab, setActiveTab] = useState<DonneesTab>('pipeline');

  const [running, setRunning] = useState(false);
  const [climateSyncing, setClimateSyncing] = useState(false);

  const [result, setResult] = useState<EtlRiskPipelineResponse | null>(null);
  const [pipelineJob, setPipelineJob] = useState<EtlPipelineJob | null>(null);
  const [latestJobs, setLatestJobs] = useState<EtlPipelineJob[]>([]);

  const [climateResult, setClimateResult] =
    useState<ClimateSyncResponse | null>(null);

  const [error, setError] = useState('');
  const [climateError, setClimateError] = useState('');

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

  const loadJobs = async () => {
    try {
      const jobs = await etlFrontendService.getLatestRiskPipelineJobs(8);
      setLatestJobs(jobs);
    } catch (jobError) {
      console.error('[DonneesPage] Erreur chargement jobs ETL:', jobError);
    }
  };

  useEffect(() => {
    loadSources();
    loadJobs();
  }, []);

  const runPipeline = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    setPipelineJob(null);

    try {
      const startedJob = await etlFrontendService.startRiskPipeline();
      setPipelineJob(startedJob);

      let currentJob = startedJob;

      while (currentJob.status === 'PENDING' || currentJob.status === 'RUNNING') {
        await sleep(2000);
        currentJob = await etlFrontendService.getRiskPipelineJob(startedJob.id);
        setPipelineJob(currentJob);
      }

      if (currentJob.status === 'SUCCESS') {
        setResult({
          message:
            currentJob.message ?? 'Pipeline de risque exécuté avec succès.',
          steps: currentJob.steps ?? [],
          alertWarning: currentJob.alertWarning ?? null,
          alertSkipped: true,
        });

        await loadSources();
        await loadJobs();
        return;
      }

      setError(
        currentJob.error
          ? `Pipeline échoué : ${currentJob.error}`
          : 'Pipeline échoué.',
      );

      await loadSources();
      await loadJobs();
    } catch (pipelineError) {
      console.error('[DonneesPage] Erreur pipeline ETL:', pipelineError);

      const message = extractErrorMessage(pipelineError);

      setError(
        message
          ? `Impossible d’exécuter le pipeline de risque : ${message}`
          : 'Impossible d’exécuter le pipeline de risque.',
      );

      await loadSources();
      await loadJobs();
    } finally {
      setRunning(false);
    }
  };

  const syncNasaPower = async () => {
    setClimateSyncing(true);
    setClimateError('');
    setClimateResult(null);

    try {
      const response = await climateFrontendService.syncNasaPower();

      setClimateResult(response);
      await loadSources();
    } catch (syncError) {
      console.error('[DonneesPage] Erreur NASA POWER:', syncError);

      const message = extractErrorMessage(syncError);

      setClimateError(
        message
          ? `Impossible de synchroniser NASA POWER : ${message}`
          : 'Impossible de synchroniser NASA POWER.',
      );

      await loadSources();
    } finally {
      setClimateSyncing(false);
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
              Cette page centralise les sources, la synchronisation climatique,
              le pipeline raster et les jobs ETL.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={syncNasaPower}
              disabled={climateSyncing || running}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
            >
              {climateSyncing ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <CloudSun size={20} />
              )}

              {climateSyncing
                ? 'NASA POWER en cours...'
                : 'Synchroniser NASA POWER'}
            </button>

            <button
              type="button"
              onClick={runPipeline}
              disabled={running || climateSyncing}
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <DataKpiCard
          label="Sources connectées"
          value={`${connectedCount}/${sources.length || 0}`}
          sub="sources actives"
        />
        <DataKpiCard
          label="Dernier job"
          value={latestJobs[0]?.status ?? '—'}
          sub={formatDateTime(latestJobs[0]?.finishedAt ?? latestJobs[0]?.updatedAt)}
        />
        <DataKpiCard
          label="Pipeline"
          value={running ? 'RUNNING' : 'READY'}
          sub={pipelineJob?.id ? `Job ${pipelineJob.id.slice(0, 8)}` : 'prêt'}
        />
        <DataKpiCard
          label="NASA POWER"
          value={climateSyncing ? 'SYNC' : 'OK'}
          sub="climat régional"
        />
      </div>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'sources', label: 'Sources', count: sources.length },
          { id: 'climate', label: 'Climat' },
          { id: 'jobs', label: 'Jobs ETL', count: latestJobs.length },
        ]}
      />

      {activeTab === 'pipeline' && (
        <div className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {pipelineJob &&
            (pipelineJob.status === 'PENDING' ||
              pipelineJob.status === 'RUNNING') && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-soft dark:border-blue-900 dark:bg-blue-950/40">
                <h3 className="text-xl font-black text-blue-900 dark:text-blue-100">
                  Job ETL en cours
                </h3>

                <p className="mt-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {pipelineJob.message ?? 'Pipeline en cours...'}
                </p>

                <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
                  Identifiant : {pipelineJob.id}
                  <br />
                  Statut : {pipelineJob.status}
                  <br />
                  Étapes terminées : {pipelineJob.steps?.length ?? 0}
                </div>
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
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                  Les alertes météo-risque historiques n’ont pas été générées par
                  ce pipeline. Les alertes validées et opérationnelles disposent
                  de leurs propres traitements.
                </div>
              )}

              {result.alertWarning && (
                <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
                  Pipeline exécuté, mais la vérification météo-risque n’a pas pu
                  être terminée :
                  <br />
                  {result.alertWarning}
                </div>
              )}

              <div className="mt-6 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {result.steps.map((step) => (
                  <PipelineStepCard key={step.name} step={step} />
                ))}
              </div>
            </div>
          )}

          {!pipelineJob && !result && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <PlayCircle className="mx-auto mb-3 text-slate-300" size={42} />
              <div className="font-black text-slate-900 dark:text-white">
                Pipeline prêt
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Lancez le pipeline pour recalculer les risques, les indicateurs,
                le DWH, les cartes de rapports et les alertes validées.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Sources de données
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Suivi des sources utilisées par les modèles de risque.
              </p>
            </div>

            <button
              type="button"
              onClick={loadSources}
              disabled={sourcesLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={sourcesLoading ? 'animate-spin' : ''}
              />
              Actualiser
            </button>
          </div>

          {sourcesError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {sourcesError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <DataSourceCard key={source.id} source={source} />
            ))}
          </div>

          {!sourcesLoading && sources.length === 0 && (
            <div className="rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Aucune source de données enregistrée.
            </div>
          )}
        </div>
      )}

      {activeTab === 'climate' && (
        <div className="space-y-5">
          {climateError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {climateError}
            </div>
          )}

          {climateResult && (
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-soft dark:border-blue-900 dark:bg-blue-950/40">
              <h3 className="text-xl font-black text-blue-900 dark:text-blue-100">
                Résultat NASA POWER
              </h3>

              <p className="mt-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                {climateResult.message}
              </p>

              <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
                Script : {climateResult.script}
                <br />
                Durée : {(climateResult.durationMs / 1000).toFixed(1)} s
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <CloudSun className="mx-auto mb-3 text-blue-400" size={44} />
            <div className="font-black text-slate-900 dark:text-white">
              Synchronisation climatique
            </div>
            <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              NASA POWER est synchronisé séparément car il fournit des données
              climatiques journalières. Ces données alimentent notamment le
              modèle sécheresse et les indicateurs climatiques.
            </p>

            <button
              type="button"
              onClick={syncNasaPower}
              disabled={climateSyncing || running}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {climateSyncing ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <CloudSun size={18} />
              )}
              {climateSyncing ? 'Synchronisation...' : 'Synchroniser NASA POWER'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Jobs ETL récents
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Suivi des dernières exécutions du pipeline.
              </p>
            </div>

            <button
              type="button"
              onClick={loadJobs}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>

          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}

            {latestJobs.length === 0 && (
              <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">
                Aucun job ETL enregistré.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DataKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function DataSourceCard({ source }: { source: DataSourceItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-slate-800 dark:hover:bg-slate-800/50">
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
          <span className="font-bold text-slate-700 dark:text-slate-200">
            Dernière réussite :
          </span>{' '}
          {formatDateTime(source.lastSuccessAt)}
        </div>

        <div>
          <span className="font-bold text-slate-700 dark:text-slate-200">
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
  );
}

function PipelineStepCard({
  step,
}: {
  step: NonNullable<EtlRiskPipelineResponse['steps']>[number];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4">
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
  );
}

function JobCard({ job }: { job: EtlPipelineJob }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-extrabold text-slate-900 dark:text-white">
            {job.message ?? job.type}
          </div>
          <div className="text-xs text-slate-500">
            {formatDateTime(job.finishedAt ?? job.updatedAt)}
          </div>
        </div>

        <span
          className={[
            'rounded-full border px-3 py-1 text-xs font-extrabold',
            getStatusClasses(job.status),
          ].join(' ')}
        >
          {getStatusLabel(job.status)}
        </span>
      </div>

      {job.durationMs && (
        <div className="mt-2 text-xs text-slate-500">
          Durée : {(job.durationMs / 1000).toFixed(1)} s
        </div>
      )}
    </div>
  );
}
