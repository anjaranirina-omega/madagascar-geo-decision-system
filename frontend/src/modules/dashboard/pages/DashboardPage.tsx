import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  CloudSun,
  Database,
  Layers,
  MapPinned,
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

const riskTypeClasses: Record<string, string> = {
  GLOBAL: 'bg-slate-100 text-slate-700 border-slate-200',
  FLOOD: 'bg-blue-50 text-blue-700 border-blue-200',
  DROUGHT: 'bg-amber-50 text-amber-700 border-amber-200',
  LANDSLIDE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CYCLONE: 'bg-purple-50 text-purple-700 border-purple-200',
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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

function statusLabel(status?: string | null) {
  switch (status) {
    case 'CONNECTED':
      return 'Connecté';
    case 'SUCCESS':
      return 'Succès';
    case 'RUNNING':
      return 'En cours';
    case 'PENDING':
      return 'En attente';
    case 'FAILED':
      return 'Erreur';
    default:
      return status ?? '—';
  }
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

function riskCellClass(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'bg-slate-50 text-slate-400';
  }

  if (value <= 30) return 'bg-green-50 text-green-700';
  if (value <= 60) return 'bg-yellow-50 text-yellow-700';
  if (value <= 80) return 'bg-orange-50 text-orange-700';

  return 'bg-red-50 text-red-700';
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
      text: 'text-green-700',
    },
    {
      key: 'MOYEN',
      label: 'Moyen',
      count: distribution?.MOYEN ?? 0,
      color: 'bg-yellow-500',
      text: 'text-yellow-700',
    },
    {
      key: 'ELEVE',
      label: 'Élevé',
      count: distribution?.ELEVE ?? 0,
      color: 'bg-orange-500',
      text: 'text-orange-700',
    },
    {
      key: 'CRITIQUE',
      label: 'Critique',
      count: distribution?.CRITIQUE ?? 0,
      color: 'bg-red-500',
      text: 'text-red-700',
    },
  ];
}

function KpiCard({
  title,
  value,
  suffix,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string;
  suffix?: string;
  subtitle: string;
  icon: typeof TrendingUp;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div
        className={[
          'absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-15 blur-2xl transition group-hover:opacity-25',
          gradient,
        ].join(' ')}
      />

      <div className="relative mb-4 flex items-center justify-between">
        <div className="text-sm font-bold text-slate-500">{title}</div>
        <div
          className={[
            'rounded-2xl p-2.5 text-white shadow-lg',
            gradient,
          ].join(' ')}
        >
          <Icon size={20} />
        </div>
      </div>

      <div className="relative">
        <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          {value}
        </span>
        {suffix && <span className="ml-1 text-sm font-bold text-slate-400">{suffix}</span>}
      </div>

      <div className="relative mt-2 text-xs font-medium text-slate-500">
        {subtitle}
      </div>
    </div>
  );
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

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 animate-spin text-riskgreen" size={30} />
          <div className="font-extrabold text-slate-900">
            Chargement du tableau de bord...
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Agrégation des indicateurs multi-risques.
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Risque global moyen',
      value: formatNumber(summary?.riskMeanNational, 1),
      suffix: '/100',
      subtitle: 'Moyenne nationale par région',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
      title: 'Zones élevées / critiques',
      value: String(summary?.elevatedOrCriticalZones ?? 0),
      subtitle: `${summary?.criticalZones ?? 0} zones critiques`,
      icon: ShieldAlert,
      gradient: 'bg-gradient-to-br from-orange-500 to-red-600',
    },
    {
      title: 'Population exposée',
      value: formatPopulation(summary?.populationExposed),
      subtitle: 'Agrégation WorldPop',
      icon: Users,
      gradient: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    },
    {
      title: 'Sources connectées',
      value: `${connectedSources}/${totalSources}`,
      subtitle: `${summary?.failedSources ?? 0} source en erreur`,
      icon: RadioTower,
      gradient: 'bg-gradient-to-br from-cyan-500 to-sky-600',
    },
    {
      title: 'Rasters actifs',
      value: String(summary?.activeRasters ?? 0),
      subtitle: `MAJ ${formatShortDate(summary?.latestRasterUpdate)}`,
      icon: Layers,
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
    },
    {
      title: 'Dernier ETL',
      value: statusLabel(summary?.latestEtlJob?.status),
      subtitle: formatShortDate(
        (summary?.latestEtlJob as any)?.finished_at ??
          (summary?.latestEtlJob as any)?.updated_at,
      ),
      icon: Database,
      gradient: 'bg-gradient-to-br from-slate-700 to-slate-950',
    },
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-7 text-white shadow-xl">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-emerald-100">
              <CheckCircle2 size={15} />
              Données réelles • DWH • SOLAP • Rasters
            </div>

            <h2 className="text-3xl font-black tracking-tight">
              Tableau de bord décisionnel multi-risques
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Vue synthétique des risques climatiques à Madagascar, alimentée par
              les rasters, les statistiques zonales, le data warehouse, les
              sources de données et les jobs ETL.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-900 shadow-lg transition hover:scale-[1.02]"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.35fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">
                Répartition des niveaux
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Indicateurs régionaux multi-risques
              </p>
            </div>
            <BarChart3 className="text-slate-400" size={22} />
          </div>

          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[170px_1fr]">
            <div
              className="relative mx-auto h-40 w-40 rounded-full shadow-inner"
              style={{ background: distributionGradient }}
            >
              <div className="absolute inset-10 rounded-full bg-white shadow-inner dark:bg-slate-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-black text-slate-950 dark:text-white">
                    {distributionTotal}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    zones-risques
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {distributionItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <span className={['h-3 w-3 rounded-full', item.color].join(' ')} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {item.label}
                    </span>
                  </div>
                  <span className={['text-sm font-black', item.text].join(' ')}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">
                Top zones multi-risques
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Classement régional par risque maximum
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              Régions
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Risque</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3 text-right">Moyen</th>
                  <th className="px-4 py-3 text-right">Max</th>
                  <th className="px-4 py-3 text-right">Niveau</th>
                </tr>
              </thead>
              <tbody>
                {topZones.map((zone, index) => (
                  <tr
                    key={`${zone.riskType}-${zone.zoneId}-${index}`}
                    className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
                  >
                    <td className="px-4 py-3 text-xs font-black text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'rounded-full border px-2.5 py-1 text-xs font-black',
                          riskTypeClasses[zone.riskType] ??
                            'border-slate-200 bg-slate-50 text-slate-600',
                        ].join(' ')}
                      >
                        {riskLabels[zone.riskType] ?? zone.riskType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                      {zone.zoneNom}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(zone.riskMean, 1)}
                    </td>
                    <td className="px-4 py-3 text-right font-black">
                      {formatNumber(zone.riskMax, 1)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={[
                          'rounded-full border px-2.5 py-1 text-xs font-black',
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
              <div className="py-10 text-center text-sm text-slate-500">
                Aucune zone à afficher.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-950 dark:text-white">
              Comparaison des risques par région
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Valeurs maximales par type de risque, issues du DWH.
            </p>
          </div>
          <MapPinned className="text-slate-400" size={22} />
        </div>

        <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Région</th>
                <th className="px-4 py-3 text-center">Global</th>
                <th className="px-4 py-3 text-center">Inondation</th>
                <th className="px-4 py-3 text-center">Sécheresse</th>
                <th className="px-4 py-3 text-center">Glissement</th>
                <th className="px-4 py-3 text-center">Cyclone</th>
              </tr>
            </thead>
            <tbody>
              {riskByRegion.map((region) => (
                <tr
                  key={region.zoneId}
                  className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
                >
                  <td className="px-4 py-3 font-black text-slate-800 dark:text-white">
                    {region.zoneNom}
                  </td>
                  {['GLOBAL', 'FLOOD', 'DROUGHT', 'LANDSLIDE', 'CYCLONE'].map(
                    (riskType) => {
                      const value = region.risks[riskType]?.riskMax;

                      return (
                        <td key={riskType} className="px-4 py-3 text-center">
                          <span
                            className={[
                              'inline-flex min-w-14 justify-center rounded-xl px-3 py-1.5 text-xs font-black',
                              riskCellClass(value),
                            ].join(' ')}
                          >
                            {formatNumber(value, 1)}
                          </span>
                        </td>
                      );
                    },
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-5 flex items-center gap-2 font-black text-slate-950 dark:text-white">
            <RadioTower size={20} />
            Sources de données
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <div
                key={source.code}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">
                      {source.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {source.provider ?? source.category}
                    </div>
                  </div>

                  <span
                    className={[
                      'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase',
                      statusClass(source.status),
                    ].join(' ')}
                  >
                    {statusLabel(source.status)}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Dernière réussite : {formatShortDate(source.lastSuccessAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-5 flex items-center gap-2 font-black text-slate-950 dark:text-white">
            <Activity size={20} />
            Derniers jobs ETL
          </h3>

          <div className="space-y-3">
            {etlJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">
                      {job.message ?? job.type}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={14} />
                      {formatShortDate(job.finishedAt ?? job.updatedAt)}
                    </div>
                  </div>

                  <span
                    className={[
                      'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase',
                      statusClass(job.status),
                    ].join(' ')}
                  >
                    {statusLabel(job.status)}
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
      </section>

      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5">
            <h3 className="flex items-center gap-2 font-black text-slate-950 dark:text-white">
              <CloudSun size={20} />
              Moyenne climatique régionale récente
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Moyenne NASA POWER des points représentatifs des régions de Madagascar.
            </p>
          </div>

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
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="text-sm font-bold text-slate-500">
                    {item.label}
                  </div>
                  <div
                    className={
                      item.value === null
                        ? 'mt-2 text-sm font-black text-slate-400'
                        : 'mt-2 text-2xl font-black text-slate-950 dark:text-white'
                    }
                  >
                    {item.value === null
                      ? 'Donnée indisponible'
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

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-5 flex items-center gap-2 font-black text-slate-950 dark:text-white">
            <BarChart3 size={20} />
            Rasters actifs récents
          </h3>

          <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
            {rasters.slice(0, 10).map((raster) => (
              <div
                key={`${raster.type}-${raster.filePath}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div>
                  <div className="font-black text-slate-900 dark:text-white">
                    {raster.name}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {raster.type}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  max {formatNumber(raster.maxValue, 1)}
                  <br />
                  {formatShortDate(raster.updatedAt)}
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
      </section>

      <section className="rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50 p-5 text-sm text-emerald-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
          <div>
            <div className="font-black">Dashboard sans données simulées</div>
            <p className="mt-1 leading-6">
              Les indicateurs affichés proviennent des rasters, des statistiques
              zonales, du data warehouse, des sources de données et des jobs ETL.
              Le module interventions n’est pas utilisé.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
