import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Droplets,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  Shield,
  SlidersHorizontal,
  Waves,
  XCircle,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs from '../../../shared/components/ui/Tabs';
import {
  AhpCalculateResponse,
  ahpService,
} from '../services/ahp.service';
import {
  CriteriaWeight,
  RiskCriterionCode,
  RiskModelPart,
  RiskModelWeight,
  SpecificRiskType,
  risquesService,
} from '../services/risques.service';

type AnalyseTab = 'global' | 'specific' | 'ahp' | 'methodology';

type AhpPresetKey = 'GLOBAL' | 'FLOOD' | 'DROUGHT' | 'CYCLONE' | 'LANDSLIDE';

const AHP_TO_DB_CRITERIA_MAP: Record<
  SpecificRiskType,
  Record<string, { part: RiskModelPart; criterion: string }>
> = {
  FLOOD: {
    precipitations: { part: 'HAZARD', criterion: 'rainfall' },
    pente: { part: 'HAZARD', criterion: 'inverse_slope' },
    proximite_cours_eau: { part: 'HAZARD', criterion: 'river_proximity' },
  },
  DROUGHT: {
    precipitations: { part: 'HAZARD', criterion: 'rainfall_deficit' },
    temperature: { part: 'HAZARD', criterion: 'temperature_stress' },
    occupation_sol: { part: 'HAZARD', criterion: 'landcover_sensitivity' },
  },
  LANDSLIDE: {
    pente: { part: 'HAZARD', criterion: 'slope' },
    precipitations: { part: 'HAZARD', criterion: 'rainfall' },
    occupation_sol: { part: 'HAZARD', criterion: 'landcover_sensitivity' },
  },
  CYCLONE: {
    vent: { part: 'HAZARD', criterion: 'track_hazard' },
    precipitations: { part: 'HAZARD', criterion: 'rainfall' },
  },
};

const ahpPresets: Record<
  AhpPresetKey,
  {
    name: string;
    criteria: string[];
    labels: string[];
    matrix: number[][];
  }
> = {
  GLOBAL: {
    name: 'Risque Global Composite (4 piliers)',
    criteria: ['precipitations', 'pente', 'population', 'occupation_sol'],
    labels: ['Climat & Pluie (CHIRPS)', 'Pente & Relief (DEM)', 'Densité Population (WorldPop)', 'Occupation du sol (WorldCover)'],
    matrix: [
      [1, 2, 2, 3],
      [1 / 2, 1, 1, 2],
      [1 / 2, 1, 1, 2],
      [1 / 3, 1 / 2, 1 / 2, 1],
    ],
  },
  FLOOD: {
    name: 'Aléa Inondation (3 critères)',
    criteria: ['precipitations', 'pente', 'proximite_cours_eau'],
    labels: ['Précipitations (CHIRPS)', 'Pente inversée (DEM)', 'Proximité rivière (HydroRIVERS)'],
    matrix: [
      [1, 2, 2],
      [1 / 2, 1, 1],
      [1 / 2, 1, 1],
    ],
  },
  DROUGHT: {
    name: 'Aléa Sécheresse (3 critères)',
    criteria: ['precipitations', 'temperature', 'occupation_sol'],
    labels: ['Déficit pluviométrique', 'Stress thermique (NASA POWER)', 'Sensibilité occupation du sol'],
    matrix: [
      [1, 2, 3],
      [1 / 2, 1, 2],
      [1 / 3, 1 / 2, 1],
    ],
  },
  CYCLONE: {
    name: 'Aléa Cyclonique (2 critères)',
    criteria: ['vent', 'precipitations'],
    labels: ['Aléa historique / Trajectoire IBTrACS', 'Pluie cyclonique (CHIRPS)'],
    matrix: [
      [1, 3],
      [1 / 3, 1],
    ],
  },
  LANDSLIDE: {
    name: 'Glissement de terrain (3 critères)',
    criteria: ['pente', 'precipitations', 'occupation_sol'],
    labels: ['Pente topographique (DEM)', 'Précipitations (CHIRPS)', 'Sensibilité du sol (WorldCover)'],
    matrix: [
      [1, 2, 3],
      [1 / 2, 1, 2],
      [1 / 3, 1 / 2, 1],
    ],
  },
};

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

  // État AHP Saaty & Microservice
  const [ahpPreset, setAhpPreset] = useState<AhpPresetKey>('FLOOD');
  const [ahpCriteria, setAhpCriteria] = useState<string[]>(ahpPresets.FLOOD.criteria);
  const [ahpLabels, setAhpLabels] = useState<string[]>(ahpPresets.FLOOD.labels);
  const [ahpMatrix, setAhpMatrix] = useState<number[][]>(ahpPresets.FLOOD.matrix);
  const [ahpNormalizedValues, setAhpNormalizedValues] = useState<Record<string, number>>({
    precipitations: 0.75,
    pente: 0.6,
    proximite_cours_eau: 0.8,
    occupation_sol: 0.5,
  });
  const [ahpResult, setAhpResult] = useState<AhpCalculateResponse | null>(null);
  const [ahpLoading, setAhpLoading] = useState(false);
  const [ahpEngineHealth, setAhpEngineHealth] = useState<{
    engineStatus?: string;
    engineUrl?: string;
  } | null>(null);
  const [applyingToEtl, setApplyingToEtl] = useState(false);

  const applyAhpWeightsToEtlModel = async () => {
    if (!ahpResult) return;

    setApplyingToEtl(true);
    setError('');
    setSuccess('');

    try {
      if (ahpPreset === 'GLOBAL') {
        const globalMapping: Record<string, RiskCriterionCode> = {
          precipitations: 'RAINFALL',
          pente: 'SLOPE',
          population: 'POPULATION',
          occupation_sol: 'LANDCOVER',
        };

        const currentGlobalWeights = weights.length ? weights : await risquesService.findWeights();

        const rawGlobalList = currentGlobalWeights.map((item) => {
          const ahpKey = Object.keys(globalMapping).find(
            (k) => globalMapping[k] === item.criterionCode,
          );
          const val =
            ahpKey && ahpResult.weights[ahpKey] !== undefined
              ? Number(Number(ahpResult.weights[ahpKey]).toFixed(4))
              : item.weight;
          return {
            criterionCode: item.criterionCode,
            weight: val,
          };
        });

        const sumG = rawGlobalList.reduce((acc, it) => acc + it.weight, 0);
        const normalizedGlobal = rawGlobalList.map((it) => ({
          criterionCode: it.criterionCode,
          weight: Number((it.weight / (sumG || 1)).toFixed(4)),
        }));

        const updatedGlobal = await risquesService.updateWeights({
          weights: normalizedGlobal,
        });
        setWeights(updatedGlobal);

        setSuccess(
          '✓ Poids du Risque Global enregistrés. Recalcul du raster global (risk_index.tif) en cours...',
        );

        await risquesService.recalculateRaster().catch(() => {});

        setSuccess(
          '✓ Modèle Risque Global et raster risk_index.tif recalculés avec succès !',
        );
      } else {
        // 1. Récupérer les poids actuels de la base pour cet aléa
        const currentWeights = await risquesService.findRiskModelWeights(ahpPreset);

        const mapping = AHP_TO_DB_CRITERIA_MAP[ahpPreset];
        if (!mapping) {
          throw new Error(`Aucun mapping de critères configuré pour ${ahpPreset}`);
        }

        // 2. Mettre à jour les critères de la partie HAZARD avec les poids AHP calculés
        const updatedList = currentWeights.map((item) => {
          const ahpKey = Object.keys(mapping).find(
            (k) => mapping[k].part === item.modelPart && mapping[k].criterion === item.criterion,
          );

          if (ahpKey && ahpResult.weights[ahpKey] !== undefined) {
            return {
              modelPart: item.modelPart,
              criterion: item.criterion,
              weight: Number(Number(ahpResult.weights[ahpKey]).toFixed(4)),
            };
          }

          return {
            modelPart: item.modelPart,
            criterion: item.criterion,
            weight: Number(Number(item.weight).toFixed(4)),
          };
        });

        // 3. Normaliser la partie HAZARD pour garantir que la somme vaut exactement 1.0
        const hazardTotal = updatedList
          .filter((w) => w.modelPart === 'HAZARD')
          .reduce((sum, w) => sum + w.weight, 0);

        const normalizedList = updatedList.map((w) => {
          if (w.modelPart === 'HAZARD' && hazardTotal > 0) {
            return {
              ...w,
              weight: Number((w.weight / hazardTotal).toFixed(4)),
            };
          }
          return w;
        });

        // 4. Sauvegarder en base de données PostgreSQL
        const savedWeights = await risquesService.updateRiskModelWeights({
          riskType: ahpPreset,
          weights: normalizedList,
        });

        // 5. Mettre à jour l'état local du modèle spécifique
        setModelWeights(savedWeights);
        setSpecificRiskType(ahpPreset);

        const modelName = ahpPresets[ahpPreset]?.name || ahpPreset;
        setSuccess(
          `✓ Poids AHP appliqués avec succès au modèle « ${modelName} » et enregistrés pour l'ETL !`,
        );
      }
    } catch (err: any) {
      console.error("Erreur d'application des poids AHP :", err);
      setError(
        err?.response?.data?.message ||
          "Impossible d'appliquer et d'enregistrer les poids AHP vers le modèle spécifique.",
      );
    } finally {
      setApplyingToEtl(false);
    }
  };

  const runAhpCalculation = async (
    customCriteria = ahpCriteria,
    customMatrix = ahpMatrix,
  ) => {
    setAhpLoading(true);
    setError('');

    try {
      const result = await ahpService.calculate({
        criteria: customCriteria,
        matrix: customMatrix,
        normalizedValues: ahpNormalizedValues,
      });
      setAhpResult(result);
    } catch (calcError: any) {
      console.error('[AnalyseMulticritere] Erreur calcul AHP:', calcError);
      setError('Impossible d’exécuter le calcul AHP.');
    } finally {
      setAhpLoading(false);
    }
  };

  const applyAhpPreset = (presetKey: AhpPresetKey) => {
    setAhpPreset(presetKey);
    const preset = ahpPresets[presetKey];
    const newCriteria = [...preset.criteria];
    const newLabels = [...preset.labels];
    const newMatrix = preset.matrix.map((row) => [...row]);

    setAhpCriteria(newCriteria);
    setAhpLabels(newLabels);
    setAhpMatrix(newMatrix);

    // Calcul automatique immédiat pour afficher les résultats et boutons du preset
    runAhpCalculation(newCriteria, newMatrix);
  };

  const updateMatrixCell = (i: number, j: number, value: number) => {
    if (i === j) return;
    const newMatrix = ahpMatrix.map((row) => [...row]);
    newMatrix[i][j] = value;
    newMatrix[j][i] = 1 / value;
    setAhpMatrix(newMatrix);
    // Recalculer automatiquement les poids dès qu'une cellule change
    runAhpCalculation(ahpCriteria, newMatrix);
  };

  useEffect(() => {
    if (activeTab === 'ahp') {
      ahpService.getHealth().then(setAhpEngineHealth).catch(() => {});
      if (!ahpResult) {
        runAhpCalculation();
      }
    }
  }, [activeTab]);

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
          { id: 'ahp', label: 'Matrice AHP (Saaty)' },
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

      {activeTab === 'ahp' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Scale size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Matrice de Saaty & Calculateur AHP
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Processus d'analyse hiérarchique (AHP) avec vérification du ratio de cohérence (CR &lt; 0.10).
                  </p>
                </div>
              </div>

              {ahpEngineHealth && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <Cpu size={14} className={ahpEngineHealth.engineStatus === 'connected' ? 'text-green-500' : 'text-amber-500'} />
                  <span>Moteur : {ahpEngineHealth.engineStatus}</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">
                Choisir un modèle de risque
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {(['GLOBAL', 'FLOOD', 'DROUGHT', 'CYCLONE', 'LANDSLIDE'] as AhpPresetKey[]).map((key) => {
                  const preset = ahpPresets[key];
                  const active = ahpPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyAhpPreset(key)}
                      className={[
                        'rounded-2xl border p-3 text-left transition',
                        active
                          ? 'border-purple-300 bg-purple-50/80 shadow-xs dark:border-purple-800 dark:bg-purple-950/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950',
                      ].join(' ')}
                    >
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {preset.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {preset.labels.join(' • ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 text-left font-black text-slate-500">Critère</th>
                    {ahpLabels.map((label, idx) => (
                      <th key={idx} className="p-3 text-center font-black text-slate-700 dark:text-slate-300">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ahpCriteria.map((cRow, i) => (
                    <tr key={cRow} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                        {ahpLabels[i]}
                      </td>
                      {ahpCriteria.map((cCol, j) => {
                        const val = ahpMatrix[i]?.[j] ?? 1;
                        if (i === j) {
                          return (
                            <td key={cCol} className="p-3 text-center font-bold text-slate-400 bg-slate-50 dark:bg-slate-950">
                              1.00
                            </td>
                          );
                        }
                        if (i < j) {
                          return (
                            <td key={cCol} className="p-3 text-center">
                              <select
                                value={val >= 1 ? val : Number((val).toFixed(4))}
                                onChange={(e) => updateMatrixCell(i, j, Number(e.target.value))}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-purple-700 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-purple-300"
                              >
                                <option value={9}>9 (Extrême)</option>
                                <option value={7}>7 (Très fort)</option>
                                <option value={5}>5 (Fort)</option>
                                <option value={3}>3 (Modéré)</option>
                                <option value={2}>2 (Faible+)</option>
                                <option value={1}>1 (Égal)</option>
                                <option value={1 / 2}>1/2</option>
                                <option value={1 / 3}>1/3</option>
                                <option value={1 / 5}>1/5</option>
                                <option value={1 / 7}>1/7</option>
                                <option value={1 / 9}>1/9</option>
                              </select>
                            </td>
                          );
                        }
                        return (
                          <td key={cCol} className="p-3 text-center text-xs font-semibold text-slate-500 bg-slate-50/50 dark:bg-slate-950/50">
                            {val < 1 ? `1/${Math.round(1 / val)}` : val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => applyAhpPreset(ahpPreset)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                <RotateCcw size={15} />
                Réinitialiser la matrice
              </button>

              <div className="flex items-center gap-2.5">
                {ahpResult && (
                  <button
                    type="button"
                    onClick={applyAhpWeightsToEtlModel}
                    disabled={applyingToEtl}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-sm font-extrabold text-white shadow-md shadow-emerald-950/20 transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {applyingToEtl ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>
                      {applyingToEtl
                        ? 'Enregistrement...'
                        : `Appliquer au modèle ETL`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => runAhpCalculation()}
                  disabled={ahpLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 text-sm font-extrabold text-white shadow-md shadow-purple-950/20 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {ahpLoading ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Activity size={17} />
                  )}
                  <span>Calculer les poids AHP</span>
                </button>
              </div>
            </div>
          </div>

          {ahpResult && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white">
                        Vecteur des poids calculés (w)
                      </h4>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        Source : {ahpResult.engine === 'fastapi' ? 'Microservice FastAPI' : 'Moteur interne Saaty'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={applyAhpWeightsToEtlModel}
                      disabled={applyingToEtl}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-black text-white shadow-sm shadow-emerald-950/20 transition hover:scale-[1.02] disabled:opacity-60"
                    >
                      {applyingToEtl ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      <span>
                        {applyingToEtl
                          ? 'Application...'
                          : `Appliquer au modèle ETL`}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {ahpCriteria.map((code, idx) => {
                      const w = ahpResult.weights[code] ?? 0;
                      const pct = (w * 100).toFixed(1);
                      return (
                        <div key={code} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-200">{ahpLabels[idx]}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-black">{pct}% ({w.toFixed(4)})</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white mb-4">
                      Vérification de la cohérence de Saaty
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950">
                        <span className="text-xs font-bold text-slate-500">Ratio de cohérence (CR) :</span>
                        <span className={[
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black',
                          ahpResult.isConsistent
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        ].join(' ')}>
                          {ahpResult.isConsistent ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {(ahpResult.consistencyRatio * 100).toFixed(2)}% {ahpResult.isConsistent ? '(Cohérent < 10%)' : '(Incohérent ≥ 10%)'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs">
                        <span className="font-bold text-slate-500">Valeur propre maximale (λ max) :</span>
                        <span className="font-black text-slate-900 dark:text-white">{ahpResult.lambdaMax}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs">
                        <span className="font-bold text-slate-500">Indice de cohérence (CI) :</span>
                        <span className="font-black text-slate-900 dark:text-white">{ahpResult.consistencyIndex}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs leading-5 text-purple-900 dark:bg-purple-950/30 dark:border-purple-900/60 dark:text-purple-200">
                    {ahpResult.isConsistent
                      ? '✓ La matrice de comparaison respecte le seuil de cohérence de Saaty (CR < 0.10). Ces poids peuvent être utilisés pour la décision spatiale.'
                      : '⚠ La matrice présente des jugements contradictoires (CR ≥ 0.10). Veuillez réajuster les comparaisons par paires.'}
                  </div>
                </div>
              </div>

              {/* Action : Appliquer les poids AHP au modèle et à l'ETL */}
              <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/70 p-6 shadow-soft dark:border-purple-900/40 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Database size={18} className="text-purple-600" />
                      {ahpPreset === 'GLOBAL'
                        ? 'Appliquer au Risque Global (risk_index.tif)'
                        : 'Appliquer au modèle de risque ETL & Modèles spécifiques'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                      {ahpPreset === 'GLOBAL'
                        ? 'Enregistre les 4 piliers synthétiques (Climat, Pente, Population, Sol) et recalcule immédiatement le raster global composite utilisé sur la Carte des risques.'
                        : 'Enregistre directement ces poids de Saaty dans la base de données PostgreSQL (risk_model_weights). Ils alimenteront les calculs rasters du pipeline ETL et mettront à jour vos curseurs dans l’onglet « Modèles spécifiques ».'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (ahpPreset === 'GLOBAL') {
                          setActiveTab('global');
                        } else {
                          setSpecificRiskType(ahpPreset);
                          setActiveTab('specific');
                        }
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      <span>
                        {ahpPreset === 'GLOBAL'
                          ? 'Voir onglet Risque global'
                          : 'Voir Modèles spécifiques'}
                      </span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={applyAhpWeightsToEtlModel}
                      disabled={applyingToEtl}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-xs font-extrabold text-white shadow-md shadow-emerald-950/20 transition hover:scale-[1.01] disabled:opacity-60"
                    >
                      {applyingToEtl ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      <span>
                        {applyingToEtl
                          ? 'Enregistrement en cours...'
                          : ahpPreset === 'GLOBAL'
                          ? 'Appliquer au Risque Global (risk_index.tif)'
                          : `Appliquer au modèle ${ahpPresets[ahpPreset]?.name.split(' ')[1] || ''}`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
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
