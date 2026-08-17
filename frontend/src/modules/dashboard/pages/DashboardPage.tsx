import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
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
import SimpleBarChart from '../../../shared/components/charts/SimpleBarChart';
import SimpleLineChart from '../../../shared/components/charts/SimpleLineChart';
import KpiCard from '../../../shared/components/ui/KpiCard';
import PageHeader from '../../../shared/components/ui/PageHeader';
import SectionCard from '../../../shared/components/ui/SectionCard';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import Tabs from '../../../shared/components/ui/Tabs';
import {
  ClimateIndicators,
  DashboardDataSource,
  DashboardEtlJob,
  DashboardRaster,
  DashboardSummary,
  RiskByRegionItem,
  RiskDistribution,
  RiskTimeSeriesPoint,
  TopRiskZone,
  dashboardService,
} from '../services/dashboard.service';

type DashboardTab = 'overview' | 'regions' | 'sources' | 'climate';

const riskLabels: Record<string, string> = {
  GLOBAL: 'Global',
  FLOOD: 'Inondation',
  DROUGHT: 'Sécheresse',
  LANDSLIDE: 'Glissement',
  CYCLONE: 'Cyclone',
};

const riskTypeClasses: Record<string, string> = {
  GLOBAL: 'bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800',
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

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

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

  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} K`;

  return value.toFixed(0);
}

function riskCellClass(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'bg-slate-50 dark:bg-slate-800 text-slate-400';
  }

  if (value <= 30) return 'bg-green-50 text-green-700';
  if (value <= 60) return 'bg-yellow-50 text-yellow-700';
  if (value <= 80) return 'bg-orange-50 text-orange-700';

  return 'bg-red-50 text-red-700';
}

function buildRiskDistributionGradient(distribution: RiskDistribution | null) {
  if (!distribution) return 'conic-gradient(#e5e7eb 0deg 360deg)';

  const values = [
    { key: 'FAIBLE', color: '#22c55e', value: distribution.FAIBLE },
    { key: 'MOYEN', color: '#eab308', value: distribution.MOYEN },
    { key: 'ELEVE', color: '#f97316', value: distribution.ELEVE },
    { key: 'CRITIQUE', color: '#ef4444', value: distribution.CRITIQUE },
  ];

  const total = values.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';

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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topZones, setTopZones] = useState<TopRiskZone[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(
    null,
  );
  const [riskByRegion, setRiskByRegion] = useState<RiskByRegionItem[]>([]);
  const [riskTimeSeries, setRiskTimeSeries] = useState<RiskTimeSeriesPoint[]>([]);
  const [sources, setSources] = useState<DashboardDataSource[]>([]);
  const [etlJobs, setEtlJobs] = useState<DashboardEtlJob[]>([]);
  const [rasters, setRasters] = useState<DashboardRaster[]>([]);
  const [climate, setClimate] = useState<ClimateIndicators | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedRiskType, setSelectedRiskType] = useState('');
  const [selectedZoneType, setSelectedZoneType] = useState('region');

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [
        summaryData,
        topRiskZonesData,
        riskDistributionData,
        riskByRegionData,
        riskTimeSeriesData,
        sourcesData,
        etlJobsData,
        rastersData,
        climateData,
      ] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTopRiskZones({
          riskType: selectedRiskType || undefined,
          zoneType: selectedZoneType,
          limit: 8,
        }),
        dashboardService.getRiskDistribution({
          riskType: selectedRiskType || undefined,
          zoneType: selectedZoneType,
        }),
        dashboardService.getRiskByRegion(),
        dashboardService.getRiskTimeSeries({
          riskType: selectedRiskType || 'GLOBAL',
          zoneType: selectedZoneType,
        }),
        dashboardService.getDataSources(),
        dashboardService.getLatestEtlJobs(5),
        dashboardService.getRasters(),
        dashboardService.getClimateIndicators(),
      ]);

      setSummary(summaryData);
      setTopZones(topRiskZonesData);
      setDistribution(riskDistributionData);
      setRiskByRegion(riskByRegionData);
      setRiskTimeSeries(riskTimeSeriesData);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRiskType, selectedZoneType]);

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

  const riskTypeBars = useMemo(() => {
    const riskTypes = ['FLOOD', 'DROUGHT', 'LANDSLIDE', 'CYCLONE'];

    return riskTypes.map((riskType) => {
      const values = riskByRegion
        .map((region) => region.risks[riskType]?.riskMax)
        .filter((value): value is number => typeof value === 'number');

      const average =
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0;

      return {
        label: riskLabels[riskType] ?? riskType,
        value: average,
        hint: 'Score max moyen régional',
        color:
          riskType === 'FLOOD'
            ? 'bg-blue-500'
            : riskType === 'DROUGHT'
              ? 'bg-amber-500'
              : riskType === 'LANDSLIDE'
                ? 'bg-emerald-500'
                : 'bg-purple-500',
      };
    });
  }, [riskByRegion]);

  const linePoints = useMemo(() => {
    return riskTimeSeries.map((item) => ({
      label: item.date,
      value: Number(item.riskMax ?? item.riskMean ?? 0),
    }));
  }, [riskTimeSeries]);

  const connectedSources = summary?.connectedSources ?? 0;
  const totalSources = summary?.totalSources ?? 0;

  const tabs = [
    { id: 'overview' as const, label: 'Vue d’ensemble' },
    { id: 'regions' as const, label: 'Risques par région', count: riskByRegion.length },
    { id: 'sources' as const, label: 'Sources & ETL', count: sources.length },
    { id: 'climate' as const, label: 'Climat & Rasters', count: rasters.length },
  ];

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-6 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 animate-spin text-riskgreen" size={30} />
          <div className="font-extrabold text-slate-900 dark:text-white">
            Chargement du tableau de bord...
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
      icon: <TrendingUp size={20} />,
      tone: 'green' as const,
    },
    {
      title: 'Zones élevées / critiques',
      value: String(summary?.elevatedOrCriticalZones ?? 0),
      subtitle: `${summary?.criticalZones ?? 0} zones critiques`,
      icon: <ShieldAlert size={20} />,
      tone: 'red' as const,
    },
    {
      title: 'Population exposée',
      value: formatPopulation(summary?.populationExposed),
      subtitle: 'Agrégation WorldPop',
      icon: <Users size={20} />,
      tone: 'blue' as const,
    },
    {
      title: 'Sources connectées',
      value: `${connectedSources}/${totalSources}`,
      subtitle: `${summary?.failedSources ?? 0} source en erreur`,
      icon: <RadioTower size={20} />,
      tone: 'blue' as const,
    },
    {
      title: 'Rasters actifs',
      value: String(summary?.activeRasters ?? 0),
      subtitle: `MAJ ${formatShortDate(summary?.latestRasterUpdate)}`,
      icon: <Layers size={20} />,
      tone: 'green' as const,
    },
    {
      title: 'Dernier ETL',
      value: summary?.latestEtlJob?.status ?? '—',
      subtitle: formatShortDate(
        (summary?.latestEtlJob as any)?.finished_at ??
          (summary?.latestEtlJob as any)?.updated_at,
      ),
      icon: <Database size={20} />,
      tone: 'slate' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord décisionnel"
        subtitle="Vue multi-risques basée sur les données raster, les indicateurs zonaux, le DWH, les sources réelles et les traitements ETL."
        icon={<BarChart3 size={28} />}
        actions={
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-lg dark:shadow-slate-950/30">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <span>SOLAP</span>
              <span className="h-1 w-1 rounded-full bg-blue-400" />
              <span>Slice</span>
              <span className="h-1 w-1 rounded-full bg-blue-400" />
              <span>Dice</span>
              <span className="h-1 w-1 rounded-full bg-blue-400" />
              <span>Roll-up</span>
            </div>

            <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
              Mode d’analyse SOLAP
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Filtrez les indicateurs par type de risque et niveau administratif.
              Le changement de niveau correspond à une opération de roll-up / drill-down.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:min-w-[540px]">
            <label className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Type de risque
              <select
                value={selectedRiskType}
                onChange={(event) => setSelectedRiskType(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:bg-slate-900"
              >
                <option value="">Tous les risques</option>
                <option value="GLOBAL">Global</option>
                <option value="FLOOD">Inondation</option>
                <option value="DROUGHT">Sécheresse</option>
                <option value="LANDSLIDE">Glissement</option>
                <option value="CYCLONE">Cyclone</option>
              </select>
            </label>

            <label className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Niveau administratif
              <select
                value={selectedZoneType}
                onChange={(event) => setSelectedZoneType(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:bg-slate-900"
              >
                <option value="region">Régions</option>
                <option value="district">Districts</option>
                <option value="commune">Communes</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-600 p-5 text-white shadow-lg shadow-blue-900/10">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white dark:bg-slate-900/20 blur-3xl" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-blue-100">
                État opérationnel de la plateforme
              </div>
              <div className="mt-1 text-2xl font-black">
                Données consolidées et prêtes pour la décision
              </div>
              <p className="mt-1 max-w-3xl text-sm text-blue-50">
                Les indicateurs visibles sont issus des rasters, des statistiques
                zonales, du data warehouse, des sources connectées et des jobs ETL.
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900/15 px-4 py-3 text-right backdrop-blur">
              <div className="text-xs font-bold text-blue-100">Dernier ETL</div>
              <div className="text-lg font-black">
                {summary?.latestEtlJob?.status ?? '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-sm font-black text-slate-500 dark:text-slate-400">
            Lecture rapide
          </div>

          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">Risques suivis</span>
              <strong className="text-slate-950 dark:text-white">5</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">Sources actives</span>
              <strong className="text-slate-950 dark:text-white">{connectedSources}/{totalSources}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">Zones-risques analysées</span>
              <strong className="text-slate-950 dark:text-white">{distributionTotal}</strong>
            </div>
          </div>
        </div>
      </section>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <SectionCard
            title="Répartition des niveaux"
            subtitle="Indicateurs filtrés selon l’analyse SOLAP"
            actions={<Activity className="text-slate-400" size={22} />}
            className="xl:col-span-1"
          >
            <div className="grid grid-cols-1 items-center gap-6">
              <div
                className="relative mx-auto h-44 w-44 rounded-full shadow-inner"
                style={{ background: distributionGradient }}
              >
                <div className="absolute inset-11 rounded-full bg-white dark:bg-slate-900 shadow-inner dark:bg-slate-900" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-950 dark:text-white dark:text-white">
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
                    className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-center gap-3">
                      <span className={['h-3 w-3 rounded-full', item.color].join(' ')} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200">
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
          </SectionCard>

          <SectionCard
            title="Évolution du risque"
            subtitle="Série temporelle issue du DWH / SOLAP"
            actions={
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {selectedRiskType || 'GLOBAL'}
              </span>
            }
            className="xl:col-span-2"
          >
            <SimpleLineChart points={linePoints} />
          </SectionCard>

          <SectionCard
            title="Risques par type"
            subtitle="Score maximum moyen par type de risque"
            actions={<BarChart3 className="text-slate-400" size={20} />}
            className="xl:col-span-1"
          >
            <SimpleBarChart items={riskTypeBars} />
          </SectionCard>

          <SectionCard
            title="Top zones multi-risques"
            subtitle="Classement par risque maximum selon les filtres"
            actions={
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:text-slate-400">
                {selectedZoneType === 'region'
                  ? 'Régions'
                  : selectedZoneType === 'district'
                    ? 'Districts'
                    : 'Communes'}
              </span>
            }
            className="xl:col-span-2"
          >
            <div className="max-h-[430px] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-950">
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
                      className="border-t border-slate-100 dark:border-slate-800 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 dark:border-slate-800 dark:hover:bg-slate-950"
                    >
                      <td className="px-4 py-3 text-xs font-black text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded-full border px-2.5 py-1 text-xs font-black',
                            riskTypeClasses[zone.riskType] ??
                              'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                          ].join(' ')}
                        >
                          {riskLabels[zone.riskType] ?? zone.riskType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">
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
                              'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                          ].join(' ')}
                        >
                          {riskLevelLabels[zone.riskLevel ?? ''] ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'regions' && (
        <SectionCard
          title="Comparaison des risques par région"
          subtitle="Valeurs maximales par type de risque, issues du DWH."
          actions={<MapPinned className="text-slate-400" size={22} />}
        >
          <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-50 dark:bg-slate-800">
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
                    className="border-t border-slate-100 dark:border-slate-800 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 dark:border-slate-200 dark:border-slate-800 dark:hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                  >
                    <td className="px-4 py-3 font-black text-slate-800 dark:text-slate-100 dark:text-slate-950 dark:text-white">
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
        </SectionCard>
      )}

      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Sources de données"
            subtitle="État des sources utilisées par les modèles."
            actions={<RadioTower size={20} className="text-slate-400" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sources.map((source) => (
                <div
                  key={source.code}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-200 dark:border-slate-800 dark:bg-slate-50 dark:bg-slate-800"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-900 dark:text-white dark:text-slate-950 dark:text-white">
                        {source.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {source.provider ?? source.category}
                      </div>
                    </div>

                    <StatusBadge status={source.status} />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Dernière réussite : {formatShortDate(source.lastSuccessAt)}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Derniers jobs ETL"
            subtitle="Historique récent des traitements."
            actions={<Activity size={20} className="text-slate-400" />}
          >
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {etlJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 dark:border-slate-200 dark:border-slate-800 dark:bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-900 dark:text-white dark:text-slate-950 dark:text-white">
                        {job.message ?? job.type}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatShortDate(job.finishedAt ?? job.updatedAt)}
                      </div>
                    </div>

                    <StatusBadge status={job.status} />
                  </div>

                  {job.durationMs && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Durée : {(job.durationMs / 1000).toFixed(1)} s
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'climate' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Moyenne climatique régionale récente"
            subtitle="Moyenne NASA POWER des points représentatifs des régions."
            actions={<CloudSun size={20} className="text-slate-400" />}
          >
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
                    className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 dark:border-slate-200 dark:border-slate-800 dark:bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {item.label}
                    </div>
                    <div
                      className={
                        item.value === null
                          ? 'mt-2 text-sm font-black text-slate-400'
                          : 'mt-2 text-2xl font-black text-slate-950 dark:text-white dark:text-slate-950 dark:text-white'
                      }
                    >
                      {item.value === null
                        ? 'Donnée indisponible'
                        : `${formatNumber(item.value, 1)} ${item.unit}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Source : {item.source}
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Date : {formatDate(climate?.date)}
            </div>
          </SectionCard>

          <SectionCard
            title="Rasters actifs récents"
            subtitle="Dernières couches raster enregistrées."
            actions={<BarChart3 size={20} className="text-slate-400" />}
          >
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {rasters.slice(0, 12).map((raster) => (
                <div
                  key={`${raster.type}-${raster.filePath}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 dark:border-slate-200 dark:border-slate-800 dark:bg-slate-50 dark:bg-slate-800"
                >
                  <div>
                    <div className="font-black text-slate-900 dark:text-white dark:text-slate-950 dark:text-white">
                      {raster.name}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {raster.type}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    max {formatNumber(raster.maxValue, 1)}
                    <br />
                    {formatShortDate(raster.updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      
    </div>
  );
}
