import { RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CriteriaWeight,
  risquesService,
} from '../services/risques.service';

export default function AnalyseMulticriterePage() {
  const navigate = useNavigate();
  const [weights, setWeights] = useState<CriteriaWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const total = useMemo(() => {
    return weights.reduce((sum, item) => sum + Number(item.weight), 0);
  }, [weights]);

  const loadWeights = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await risquesService.findWeights();
      setWeights(data);
    } catch {
      setError('Impossible de charger les poids des critères.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeights();
  }, []);

  const updateLocalWeight = (id: string, value: number) => {
    setWeights((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              weight: value,
            }
          : item,
      ),
    );
  };

  const normalizeWeights = () => {
    if (total <= 0) {
      return;
    }

    setWeights((current) =>
      current.map((item) => ({
        ...item,
        weight: Number((item.weight / total).toFixed(4)),
      })),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const roundedWeights = weights.map((item) => ({
      criterionCode: item.criterionCode,
      weight: Number(Number(item.weight).toFixed(4)),
    }));

    const roundedTotal = Number(
      roundedWeights.reduce((sum, item) => sum + item.weight, 0).toFixed(4),
    );

    if (Math.abs(roundedTotal - 1) > 0.001) {
      setError(`La somme des poids doit être égale à 1. Somme actuelle : ${roundedTotal}`);
      setSaving(false);
      return;
    }

    try {
      await risquesService.updateWeights({
        weights: roundedWeights,
      });

      setSuccess('Poids enregistrés. Recalcul du raster en cours...');

      await risquesService.recalculateRaster();

      setSuccess('Raster recalculé avec succès. Redirection vers la carte...');

      setTimeout(() => {
        navigate('/carte');
      }, 900);
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as any).response?.data?.message
          ? Array.isArray((error as any).response.data.message)
            ? (error as any).response.data.message.join(' ')
            : (error as any).response.data.message
          : 'Impossible d’enregistrer les poids ou de recalculer le raster.';

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <SlidersHorizontal size={30} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Analyse multicritère — Poids AHP
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Configurez les poids des critères utilisés dans le calcul raster
              de l’indice de risque climatique. La somme des poids doit être
              égale à 1.
            </p>
          </div>

          <button
            onClick={loadWeights}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-52 items-center justify-center text-slate-500">
            <RefreshCw className="mr-3 animate-spin" size={22} />
            Chargement des critères...
          </div>
        ) : (
          <div className="space-y-5">
            {weights.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.criterionCode}
                    </div>
                  </div>

                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {Number(item.weight).toFixed(2)}
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={item.weight}
                  onChange={(event) =>
                    updateLocalWeight(item.id, Number(event.target.value))
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Somme des poids : {total.toFixed(4)}
              </div>
              <div
                className={
                  Math.abs(total - 1) <= 0.001
                    ? 'text-sm font-semibold text-green-600'
                    : 'text-sm font-semibold text-red-600'
                }
              >
                {Math.abs(total - 1) <= 0.001
                  ? 'Somme valide'
                  : 'La somme doit être égale à 1'}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={normalizeWeights}
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Normaliser
              </button>

              <button
                onClick={handleSave}
                disabled={saving || Math.abs(total - 1) > 0.001}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? 'Traitement...' : 'Enregistrer et recalculer'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          Utilisation dans le pipeline raster
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Après modification des poids, relancez le script ETL
          <code className="mx-1 rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
            weighted_overlay.py
          </code>
          pour recalculer le raster
          <code className="mx-1 rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
            risk_index.tif
          </code>
          avec les nouveaux poids.
        </p>
      </div>
    </div>
  );
}
