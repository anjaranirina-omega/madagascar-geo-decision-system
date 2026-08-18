import {
  AlertTriangle,
  Droplets,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Waves,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs from '../../../shared/components/ui/Tabs';
import {
  CriteriaWeight,
  RiskModelPart,
  RiskModelWeight,
  SpecificRiskType,
  risquesService,
} from '../services/risques.service';

type AnalyseTab = 'global' | 'specific' | 'methodology';

const specificRiskOptions: Array<{
  type: SpecificRiskType;
  label: string;
  description: string;
  icon: typeof Waves;
}> = [
  {
    type: 'FLOOD',
    label: 'Inondation',
    description: 'Pluie, pente inversée, proximité rivière, exposition.',
    icon: Waves,
  },
  {
    type: 'DROUGHT',
    label: 'Sécheresse',
    description: 'Déficit pluviométrique, température, sensibilité territoriale.',
    icon: Droplets,
  },
  {
    type: 'LANDSLIDE',
    label: 'Glissement de terrain',
    description: 'Pente, pluie, occupation du sol, exposition.',
    icon: AlertTriangle,
  },
  {
    type: 'CYCLONE',
    label: 'Cyclone',
    description: 'Trajectoires IBTrACS, pluie, exposition, vulnérabilité.',
    icon: Zap,
  },
];

const modelPartLabels: Record<RiskModelPart, string> = {
  HAZARD: 'Aléa',
  RISK: 'Risque',
};

function sumWeights(weights: Array<{ weight: number }>) {
  return Number(
    weights.reduce((sum, item) => sum + Number(item.weight), 0).toFixed(4),
  );
}

function WeightSlider({
  label,
  code,
  weight,
  onChange,
}: {
  label: string;
  code: string;
  weight: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="font-extrabold text-slate-900 dark:text-white">
            {label}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {code}
          </div>
        </div>

        <div className="text-xl font-black text-slate-900 dark:text-white">
          {Number(weight).toFixed(2)}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={weight}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function AnalyseMulticriterePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AnalyseTab>('global');

  const [weights, setWeights] = useState<CriteriaWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [specificRiskType, setSpecificRiskType] =
    useState<SpecificRiskType>('FLOOD');
  const [modelWeights, setModelWeights] = useState<RiskModelWeight[]>([]);
  const [loadingModelWeights, setLoadingModelWeights] = useState(false);
  const [savingModelWeights, setSavingModelWeights] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const total = useMemo(() => {
    return sumWeights(weights);
  }, [weights]);

  const groupedModelWeights = useMemo(() => {
    return modelWeights.reduce<Record<RiskModelPart, RiskModelWeight[]>>(
      (acc, item) => {
        acc[item.modelPart] = [...(acc[item.modelPart] ?? []), item];
        return acc;
      },
      {
        HAZARD: [],
        RISK: [],
      },
    );
  }, [modelWeights]);

  const modelPartTotals = useMemo(() => {
    return {
      HAZARD: sumWeights(groupedModelWeights.HAZARD),
      RISK: sumWeights(groupedModelWeights.RISK),
    };
  }, [groupedModelWeights]);

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

  const loadSpecificWeights = async (riskType = specificRiskType) => {
    setLoadingModelWeights(true);
    setError('');

    try {
      const data = await risquesService.findRiskModelWeights(riskType);
      setModelWeights(data);
    } catch {
      setError('Impossible de charger les poids du modèle spécifique.');
    } finally {
      setLoadingModelWeights(false);
    }
  };

  useEffect(() => {
    loadWeights();
  }, []);

  useEffect(() => {
    loadSpecificWeights(specificRiskType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specificRiskType]);

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

  const updateLocalModelWeight = (id: string, value: number) => {
    setModelWeights((current) =>
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
    if (total <= 0) return;

    setWeights((current) =>
      current.map((item) => ({
        ...item,
        weight: Number((item.weight / total).toFixed(4)),
      })),
    );
  };

  const normalizeModelPart = (part: RiskModelPart) => {
    const partWeights = groupedModelWeights[part];
    const partTotal = sumWeights(partWeights);

    if (partTotal <= 0) return;

    setModelWeights((current) =>
      current.map((item) =>
        item.modelPart === part
          ? {
              ...item,
              weight: Number((item.weight / partTotal).toFixed(4)),
            }
          : item,
      ),
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
      setError(
        `La somme des poids doit être égale à 1. Somme actuelle : ${roundedTotal}`,
      );
      setSaving(false);
      return;
    }

    try {
      await risquesService.updateWeights({
        weights: roundedWeights,
      });

      setSuccess('Poids globaux enregistrés. Recalcul du raster en cours...');

      await risquesService.recalculateRaster();

      setSuccess('Raster global recalculé avec succès. Redirection vers la carte...');

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

  const handleSaveModelWeights = async () => {
    setSavingModelWeights(true);
    setError('');
    setSuccess('');

    const roundedWeights = modelWeights.map((item) => ({
      modelPart: item.modelPart,
      criterion: item.criterion,
      weight: Number(Number(item.weight).toFixed(4)),
    }));

    const hazardTotal = Number(
      roundedWeights
        .filter((item) => item.modelPart === 'HAZARD')
        .reduce((sum, item) => sum + item.weight, 0)
        .toFixed(4),
    );

    const riskTotal = Number(
      roundedWeights
        .filter((item) => item.modelPart === 'RISK')
        .reduce((sum, item) => sum + item.weight, 0)
        .toFixed(4),
    );

    if (Math.abs(hazardTotal - 1) > 0.001 || Math.abs(riskTotal - 1) > 0.001) {
      setError(
        `Les sommes doivent être égales à 1. Aléa=${hazardTotal}, Risque=${riskTotal}`,
      );
      setSavingModelWeights(false);
      return;
    }

    try {
      const updated = await risquesService.updateRiskModelWeights({
        riskType: specificRiskType,
        weights: roundedWeights,
      });

      setModelWeights(updated);
      setSuccess(
        'Poids du modèle spécifique enregistrés. Ils seront appliqués au prochain lancement du pipeline de risque depuis la page Données.',
      );
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as any).response?.data?.message
          ? Array.isArray((error as any).response.data.message)
            ? (error as any).response.data.message.join(' ')
            : (error as any).response.data.message
          : 'Impossible d’enregistrer les poids du modèle spécifique.';

      setError(message);
    } finally {
      setSavingModelWeights(false);
    }
  };

  const resetSpecificDefaults = async () => {
    setSavingModelWeights(true);
    setError('');
    setSuccess('');

    try {
      await risquesService.resetRiskModelWeights();
      await loadSpecificWeights(specificRiskType);
      setSuccess('Poids spécifiques réinitialisés avec les valeurs par défaut.');
    } catch {
      setError('Impossible de réinitialiser les poids spécifiques.');
    } finally {
      setSavingModelWeights(false);
    }
  };

  const selectedRiskOption = specificRiskOptions.find(
    (item) => item.type === specificRiskType,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <SlidersHorizontal size={30} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Analyse multicritère — Pondérations
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Configurez les poids de l’indice global et des modèles spécifiques.
              Les poids globaux peuvent recalculer directement le raster global.
              Les poids spécifiques seront appliqués lors du prochain pipeline.
            </p>
          </div>
          <button
            onClick={() => {
              loadWeights();
              loadSpecificWeights();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
        </div>
      </div>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'global', label: 'Risque global' },
          { id: 'specific', label: 'Modèles spécifiques' },
          { id: 'methodology', label: 'Méthodologie' },
        ]}
      />

      {activeTab === 'global' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <Shield className="text-riskgreen" size={24} />
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Poids du risque global
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ces poids alimentent directement le raster global risk_index.tif.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-52 items-center justify-center text-slate-500">
              <RefreshCw className="mr-3 animate-spin" size={22} />
              Chargement des critères...
            </div>
          ) : (
            <div className="space-y-5">
              {weights.map((item) => (
                <WeightSlider
                  key={item.id}
                  label={item.label}
                  code={item.criterionCode}
                  weight={item.weight}
                  onChange={(value) => updateLocalWeight(item.id, value)}
                />
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
        </div>
      )}

      {activeTab === 'specific' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Poids des modèles spécifiques
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Ces poids contrôlent les modèles inondation, sécheresse,
                glissement de terrain et cyclone. Ils sont appliqués lors du
                prochain lancement du pipeline depuis la page Données.
              </p>
            </div>

            <button
              type="button"
              onClick={resetSpecificDefaults}
              disabled={savingModelWeights}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={17} />
              Réinitialiser tous
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {specificRiskOptions.map((item) => {
              const Icon = item.icon;
              const active = specificRiskType === item.type;

              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSpecificRiskType(item.type)}
                  className={[
                    'rounded-2xl border p-4 text-left transition',
                    active
                      ? 'border-blue-300 bg-blue-50 shadow-sm dark:border-blue-700 dark:bg-blue-950/40'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900',
                  ].join(' ')}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                      ].join(' ')}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="font-black text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                  </div>
                  <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Modèle sélectionné : {selectedRiskOption?.label}. Les poids sont
            séparés entre la partie Aléa et la partie Risque.
          </div>

          {loadingModelWeights ? (
            <div className="flex h-52 items-center justify-center text-slate-500">
              <RefreshCw className="mr-3 animate-spin" size={22} />
              Chargement des poids du modèle...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {(['HAZARD', 'RISK'] as RiskModelPart[]).map((part) => (
                <div
                  key={part}
                  className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white">
                        {modelPartLabels[part]}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Somme : {modelPartTotals[part].toFixed(4)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => normalizeModelPart(part)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Normaliser
                    </button>
                  </div>

                  <div className="space-y-4">
                    {groupedModelWeights[part].map((item) => (
                      <WeightSlider
                        key={item.id}
                        label={item.label}
                        code={item.criterion}
                        weight={item.weight}
                        onChange={(value) =>
                          updateLocalModelWeight(item.id, value)
                        }
                      />
                    ))}
                  </div>

                  <div
                    className={
                      Math.abs(modelPartTotals[part] - 1) <= 0.001
                        ? 'mt-4 text-sm font-bold text-green-600'
                        : 'mt-4 text-sm font-bold text-red-600'
                    }
                  >
                    {Math.abs(modelPartTotals[part] - 1) <= 0.001
                      ? 'Somme valide'
                      : 'La somme doit être égale à 1'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveModelWeights}
              disabled={
                savingModelWeights ||
                Math.abs(modelPartTotals.HAZARD - 1) > 0.001 ||
                Math.abs(modelPartTotals.RISK - 1) > 0.001
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {savingModelWeights
                ? 'Enregistrement...'
                : 'Enregistrer les poids spécifiques'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'methodology' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Utilisation dans le pipeline raster
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Les poids du risque global peuvent recalculer directement le raster
            global. Les poids spécifiques sont utilisés par les scripts des
            modèles inondation, sécheresse, glissement et cyclone lors du
            prochain pipeline ETL lancé depuis la page Données.
          </p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Les modèles spécifiques sont séparés en deux parties : Aléa et
            Risque. Chaque partie doit avoir une somme de poids égale à 1.
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
          <div>{success}</div>

          {success.includes('pipeline de risque') && (
            <button
              type="button"
              onClick={() => navigate('/donnees')}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-green-600 px-4 text-sm font-extrabold text-white transition hover:bg-green-700"
            >
              Aller au pipeline de données
            </button>
          )}
        </div>
      )}
    </div>
  );
}
