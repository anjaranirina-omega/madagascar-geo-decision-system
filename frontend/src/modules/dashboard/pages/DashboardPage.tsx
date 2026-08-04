import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  CloudSun,
  Database,
  Layers,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ClimateIndicators,
  DashboardDataSource,
  DashboardEtlJob,
  DashboardRaster,
  DashboardSummary,
  RiskByRegionItem,
  RiskDistribution,
  TopRiskZone,
  dashboardService,
} from '../services/dashboard.service';

const riskLabels: Record<string, string> = {
  GLOBAL: 'Global',
  FLOOD: 'Inondation',
  DROUGHT: 'Sécheresse',
  LANDSLIDE: 'Glissement',
  CYCLONE: 'Cyclone',
};

const riskLevelLabels: Record<string, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const riskLevelClasses: Record<string, string> = {
  FAIBLE: 'bg-green-50 text-green-700 border-green-200',
  MOYEN: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ELEVE: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITIQUE: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: digits,
  });
}

function formatPopulation(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} K`;
  }

  return value.toFixed(0);
}

function buildRiskDistributionGradient(distribution: RiskDistribution | null) {
  if (!distribution) {
    return 'conic-gradient(#e5e7eb 0deg 360deg)';
  }

  const values = [
    { key: 'FAIBLE', color: '#22c55e', value: distribution.FAIBLE },
    { key: 'MOYEN', color: '#eab308', value: distribution.MOYEN },
    { key: 'ELEVE', color: '#f97316', value: distribution.ELEVE },
    { key: 'CRITIQUE', color: '#ef4444', value: distribution.CRITIQUE },
  ];

  const total = values.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return 'conic-gradient(#e5e7eb 0deg 360deg)';
  }

  let currentAngle = 0;

  const parts = values
    .filter((item) => item.value > 0)
    .map((item) => {
      const angle = (item.value / total) * 360;
      const start = currentAngle;
      const end = currentAngle + angle;

      currentAngle = end;

      return `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    });

  return `conic-gradient(${parts.join(', ')})`;
}

function riskDistributionItems(distribution: RiskDistribution | null) {
  return [
    {
      key: 'FAIBLE',
      label: 'Faible',
      count: distribution?.FAIBLE ?? 0,
      color: 'bg-green-500',
    },
    {
      key: 'MOYEN',
      label: 'Moyen',
      count: distribution?.MOYEN ?? 0,
      color: 'bg-yellow-500',
    },
    {
      key: 'ELEVE',
      label: 'Élevé',
      count: distribution?.ELEVE ?? 0,
      color: 'bg-orange-500',
    },
    {
      key: 'CRITIQUE',
      label: 'Critique',
      count: distribution?.CRITIQUE ?? 0,
      color: 'bg-red-500',
    },
  ];
}

function statusClass(status?: string | null) {
  switch (status) {
    case 'CONNECTED':
    case 'SUCCESS':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'RUNNING':
    case 'PENDING':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topZones, setTopZones] = useState<TopRiskZone[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(
    null,
  );
  const [riskByRegion, setRiskByRegion] = useState<RiskByRegionItem[]>([]);
  const [sources, setSources] = useState<DashboardDataSource[]>([]);
  const [etlJobs, setEtlJobs] = useState<DashboardEtlJob[]>([]);
  const [rasters, setRasters] = useState<DashboardRaster[]>([]);
  const [climate, setClimate] = useState<ClimateIndicators | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [
        summaryData,
        topRiskZonesData,
        riskDistributionData,
        riskByRegionData,
        sourcesData,
        etlJobsData,
        rastersData,
        climateData,
      ] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTopRiskZones({
          zoneType: 'region',
          limit: 8,
        }),
        dashboardService.getRiskDistribution({
          zoneType: 'region',
        }),
        dashboardService.getRiskByRegion(),
        dashboardService.getDataSources(),
        dashboardService.getLatestEtlJobs(5),
        dashboardService.getRasters(),
        dashboardService.getClimateIndicators(),
      ]);

      setSummary(summaryData);
      setTopZones(topRiskZonesData);
      setDistribution(riskDistributionData);
      setRiskByRegion(riskByRegionData);
      setSources(sourcesData);
      setEtlJobs(etlJobsData);
      setRasters(rastersData);
      setClimate(climateData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const distributionTotal = useMemo(() => {
    if (!distribution) return 0;

    return (
      distribution.FAIBLE +
      distribution.MOYEN +
      distribution.ELEVE +
      distribution.CRITIQUE
    );
  }, [distribution]);

  const distributionGradient = buildRiskDistributionGradient(distribution);
  const distributionItems = riskDistributionItems(distribution);

  const connectedSources = summary?.connectedSources ?? 0;
  const totalSources = summary?.totalSources ?? 0;

  const kpis = [
    {
      title: 'Risque global moyen',
      value: formatNumber(summary?.riskMeanNational, 1),
      suffix: '/100',
      subtitle: 'Moyenne nationale par région',
      icon: TrendingUp,
    },
    {
      title: 'Zones élevées / critiques',
      value: String(summary?.elevatedOrCriticalZones ?? 0),
      suffix: '',
      subtitle: `${summary?.criticalZones ?? 0} critiques`,
      icon: ShieldAlert,
    },
    {
      title: 'Population exposée',
      value: formatPopulation(summary?.populationExposed),
      suffix: '',
      subtitle: 'Estimation WorldPop agrégée',
      icon: Users,
    },
    {
      title: 'Sources connectées',
      value: `${connectedSources}/${totalSources}`,
      suffix: '',
      subtitle: `${summary?.failedSources ?? 0} en erreur`,
      icon: RadioTower,
    },
    {
      title: 'Rasters actifs',
      value: String(summary?.activeRasters ?? 0),
      suffix: '',
      subtitle: `MAJ ${formatDate(summary?.latestRasterUpdate)}`,
      icon: Layers,
    },
    {
      title: 'Dernier ETL',
      value: summary?.latestEtlJob?.status ?? '—',
      suffix: '',
      subtitle: formatDate(summary?.latestEtlJob?.finished_at),
      icon: Database,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Chargement du tableau de bord...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Tableau de bord décisionnel
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Vue multi-risques basée sur les données raster, les indicateurs
            zonaux, le DWH et les sources réelles.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={18} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div key={kpi.title} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-500">
                  {kpi.title}
                </div>
                <div className="rounded-2xl bg-slate-50 p-2 text-riskgreen dark:bg-slate-800">
                  <Icon size={22} />
                </div>
              </div>

              <div>
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {kpi.value}
                </span>
                {kpi.suffix && (
                  <span className="ml-1 text-slate-500">{kpi.suffix}</span>
                )}
              </div>

              <div className="mt-2 text-xs text-slate-500">{kpi.subtitle}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="card p-6">
          <h3 className="mb-6 font-extrabold text-slate-900 dark:text-white">
            Répartition des niveaux de risque
          </h3>

          <div className="grid grid-cols-[150px_1fr] items-center gap-5">
            <div
              className="relative h-36 w-36 rounded-full"
              style={{ background: distributionGradient }}
            >
              <div className="absolute inset-9 rounded-full bg-white dark:bg-slate-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {distributionTotal}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    zones-risques
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {distributionItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span>
                    <i
                      className={[
                        'mr-2 inline-block h-3 w-3 rounded-full',
                        item.color,
                      ].join(' ')}
                    />
                    {item.label}
                  </span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Basé sur les indicateurs régionaux multi-risques.
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 dark:text-white">
              Top zones multi-risques
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              Régions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-3">Risque</th>
                  <th className="pb-3">Zone</th>
                  <th className="pb-3">Moyen</th>
                  <th className="pb-3">Max</th>
                  <th className="pb-3">Niveau</th>
                </tr>
              </thead>
              <tbody>
                {topZones.map((zone) => (
                  <tr
                    key={`${zone.riskType}-${zone.zoneId}`}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-3 font-semibold">
                      {riskLabels[zone.riskType] ?? zone.riskType}
                    </td>
                    <td className="py-3">{zone.zoneNom}</td>
                    <td className="py-3">{formatNumber(zone.riskMean, 1)}</td>
                    <td className="py-3 font-bold">
                      {formatNumber(zone.riskMax, 1)}
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'rounded-full border px-2 py-1 text-xs font-bold',
                          riskLevelClasses[zone.riskLevel ?? ''] ??
                            'border-slate-200 bg-slate-50 text-slate-500',
                        ].join(' ')}
                      >
                        {riskLevelLabels[zone.riskLevel ?? ''] ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {topZones.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                Aucune zone à afficher.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-5 font-extrabold text-slate-900 dark:text-white">
          Comparaison des risques par région
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Région</th>
                <th className="pb-3">Global</th>
                <th className="pb-3">Inondation</th>
                <th className="pb-3">Sécheresse</th>
                <th className="pb-3">Glissement</th>
                <th className="pb-3">Cyclone</th>
              </tr>
            </thead>
            <tbody>
              {riskByRegion.map((region) => (
                <tr
                  key={region.zoneId}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="py-3 font-bold">{region.zoneNom}</td>
                  {['GLOBAL', 'FLOOD', 'DROUGHT', 'LANDSLIDE', 'CYCLONE'].map(
                    (riskType) => (
                      <td key={riskType} className="py-3">
                        {formatNumber(region.risks[riskType]?.riskMax, 1)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-5 flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <RadioTower size={20} />
            Sources de données
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <div
                key={source.code}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {source.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {source.provider ?? source.category}
                    </div>
                  </div>

                  <span
                    className={[
                      'rounded-full border px-2 py-1 text-xs font-bold',
                      statusClass(source.status),
                    ].join(' ')}
                  >
                    {source.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Dernière réussite : {formatDate(source.lastSuccessAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-5 flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <Activity size={20} />
            Derniers jobs ETL
          </h3>

          <div className="space-y-3">
            {etlJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {job.message ?? job.type}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(job.finishedAt ?? job.updatedAt)}
                    </div>
                  </div>

                  <span
                    className={[
                      'rounded-full border px-2 py-1 text-xs font-bold',
                      statusClass(job.status),
                    ].join(' ')}
                  >
                    {job.status}
                  </span>
                </div>

                {job.durationMs && (
                  <div className="mt-2 text-xs text-slate-500">
                    Durée : {(job.durationMs / 1000).toFixed(1)} s
                  </div>
                )}
              </div>
            ))}

            {etlJobs.length === 0 && (
              <div className="text-sm text-slate-500">
                Aucun job ETL enregistré.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="card p-6">
          <h3 className="mb-5 flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <CloudSun size={20} />
            Indicateurs climatiques récents
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {climate &&
              [
                climate.temperature,
                climate.humidity,
                climate.wind,
                climate.precipitation,
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {item.value === null
                      ? '—'
                      : `${formatNumber(item.value, 1)} ${item.unit}`}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Source : {item.source}
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Date : {formatDate(climate?.date)}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-5 flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <BarChart3 size={20} />
            Rasters actifs récents
          </h3>

          <div className="space-y-3">
            {rasters.slice(0, 8).map((raster) => (
              <div
                key={`${raster.type}-${raster.filePath}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {raster.name}
                  </div>
                  <div className="text-xs text-slate-500">{raster.type}</div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  max {formatNumber(raster.maxValue, 1)}
                  <br />
                  {formatDate(raster.updatedAt)}
                </div>
              </div>
            ))}

            {rasters.length === 0 && (
              <div className="text-sm text-slate-500">
                Aucun raster actif enregistré.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
          <div>
            <div className="font-extrabold">Dashboard sans données simulées</div>
            <p className="mt-1 leading-6">
              Les indicateurs affichés proviennent des rasters, des statistiques
              zonales, du data warehouse, des sources de données et des jobs ETL.
              Le module interventions n’est pas utilisé.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
