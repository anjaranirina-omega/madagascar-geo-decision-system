import { Database, PlayCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
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

export default function DonneesPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EtlRiskPipelineResponse | null>(null);
  const [error, setError] = useState('');

  const runPipeline = async () => {
    setRunning(true);
    setError('');
    setResult(null);

    try {
      const response = await etlFrontendService.runRiskPipeline();

      setResult(response);
    } catch (pipelineError) {
      console.error('[DonneesPage] Erreur pipeline ETL:', pipelineError);

      const message = extractPipelineErrorMessage(pipelineError);

      setError(
        message
          ? `Impossible d’exécuter le pipeline de risque : ${message}`
          : 'Impossible d’exécuter le pipeline de risque.',
      );
    } finally {
      setRunning(false);
    }
  };

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
