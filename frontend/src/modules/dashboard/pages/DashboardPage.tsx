import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Database,
  Droplets,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  Map as MapIcon,
  MapPinned,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Thermometer,
  TrendingUp,
  Users,
  Wind,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleBarChart from '../../../shared/components/charts/SimpleBarChart';
import SimpleLineChart from '../../../shared/components/charts/SimpleLineChart';
import KpiCard from '../../../shared/components/ui/KpiCard';
import PageHeader from '../../../shared/components/ui/PageHeader';
import SectionCard from '../../../shared/components/ui/SectionCard';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import Tabs from '../../../shared/components/ui/Tabs';
import { ActiveCyclone, cyclonesService } from '../../cartographie/services/cyclones.service';
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
  GLOBAL: 'Global Composite',
  FLOOD: 'Inondation',
  DROUGHT: 'Sécheresse',
  LANDSLIDE: 'Glissement de terrain',
  CYCLONE: 'Cyclone',
};

const riskShortLabels: Record<string, string> = {
  '': 'Tous les risques',
  GLOBAL: 'Global',
  FLOOD: 'Inondations',
  DROUGHT: 'Sécheresse',
  LANDSLIDE: 'Glissements',
  CYCLONE: 'Cyclones',
};

const riskTypeIcons: Record<string, string> = {
  '': '🌐',
  GLOBAL: '🌐',
  FLOOD: '🌊',
  DROUGHT: '☀️',
  LANDSLIDE: '🏔️',
  CYCLONE: '🌀',
};

const riskTypeClasses: Record<string, string> = {
  GLOBAL: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  FLOOD: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  DROUGHT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  LANDSLIDE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  CYCLONE: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
};

const riskLevelLabels: Record<string, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const riskLevelClasses: Record<string, string> = {
  FAIBLE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  MOYEN: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  ELEVE: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  CRITIQUE: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
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
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M hab.`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k hab.`;
  return `${value.toFixed(0)} hab.`;
}

function riskCellClass(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'bg-slate-50 dark:bg-slate-800 text-slate-400';
  }
  if (value <= 30) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (value <= 60) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (value <= 80) return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300';
  return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold';
}

function getRiskScoreTone(score?: number | null): 'green' | 'orange' | 'red' {
  if (!score) return 'green';
  if (score < 40) return 'green';
  if (score < 70) return 'orange';
  return 'red';
}

function buildRiskDistributionGradient(distribution: RiskDistribution | null) {
  if (!distribution) return 'conic-gradient(#e2e8f0 0deg 360deg)';

  const values = [
    { key: 'FAIBLE', color: '#10b981', value: distribution.FAIBLE },
    { key: 'MOYEN', color: '#f59e0b', value: distribution.MOYEN },
    { key: 'ELEVE', color: '#f97316', value: distribution.ELEVE },
    { key: 'CRITIQUE', color: '#ef4444', value: distribution.CRITIQUE },
  ];

  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';

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
  const total =
    (distribution?.FAIBLE ?? 0) +
    (distribution?.MOYEN ?? 0) +
    (distribution?.ELEVE ?? 0) +
    (distribution?.CRITIQUE ?? 0);

  return [
    {
      key: 'FAIBLE',
      label: 'Risque Faible',
      count: distribution?.FAIBLE ?? 0,
      pct: total > 0 ? (((distribution?.FAIBLE ?? 0) / total) * 100).toFixed(1) : '0',
      color: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      key: 'MOYEN',
      label: 'Risque Moyen',
      count: distribution?.MOYEN ?? 0,
      pct: total > 0 ? (((distribution?.MOYEN ?? 0) / total) * 100).toFixed(1) : '0',
      color: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      key: 'ELEVE',
      label: 'Risque Élevé',
      count: distribution?.ELEVE ?? 0,
      pct: total > 0 ? (((distribution?.ELEVE ?? 0) / total) * 100).toFixed(1) : '0',
      color: 'bg-orange-500',
      text: 'text-orange-700 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      key: 'CRITIQUE',
      label: 'Risque Critique',
      count: distribution?.CRITIQUE ?? 0,
      pct: total > 0 ? (((distribution?.CRITIQUE ?? 0) / total) * 100).toFixed(1) : '0',
      color: 'bg-rose-500',
      text: 'text-rose-700 dark:text-rose-400 font-bold',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
    },
  ];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topZones, setTopZones] = useState<TopRiskZone[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(null);
  const [riskByRegion, setRiskByRegion] = useState<RiskByRegionItem[]>([]);
  const [riskTimeSeries, setRiskTimeSeries] = useState<RiskTimeSeriesPoint[]>([]);
  const [sources, setSources] = useState<DashboardDataSource[]>([]);
  const [etlJobs, setEtlJobs] = useState<DashboardEtlJob[]>([]);
  const [rasters, setRasters] = useState<DashboardRaster[]>([]);
  const [climate, setClimate] = useState<ClimateIndicators | null>(null);
  const [activeCyclones, setActiveCyclones] = useState<ActiveCyclone[]>([]);
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
        cyclonesData,
      ] = await Promise.allSettled([
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
        cyclonesService.getActiveCyclones(false),
      ]);

      if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
      if (topRiskZonesData.status === 'fulfilled') setTopZones(topRiskZonesData.value);
      if (riskDistributionData.status === 'fulfilled') setDistribution(riskDistributionData.value);
      if (riskByRegionData.status === 'fulfilled') setRiskByRegion(riskByRegionData.value);
      if (riskTimeSeriesData.status === 'fulfilled') setRiskTimeSeries(riskTimeSeriesData.value);
      if (sourcesData.status === 'fulfilled') setSources(sourcesData.value);
      if (etlJobsData.status === 'fulfilled') setEtlJobs(etlJobsData.value);
      if (rastersData.status === 'fulfilled') setRasters(rastersData.value);
      if (climateData.status === 'fulfilled') setClimate(climateData.value);
      if (cyclonesData.status === 'fulfilled') setActiveCyclones(cyclonesData.value);
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

  const topVulnerableZone = useMemo(() => {
    if (!topZones || topZones.length === 0) return null;
    return topZones[0];
  }, [topZones]);

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
    { id: 'overview' as const, label: 'Vue d’ensemble stratégique' },
    { id: 'regions' as const, label: 'Risques par région (23)', count: riskByRegion.length },
    { id: 'sources' as const, label: 'Sources & Pipelines ETL', count: sources.length },
    { id: 'climate' as const, label: 'Météo & Couches Rasters', count: rasters.length },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-6 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 animate-spin text-riskgreen" size={32} />
          <div className="font-extrabold text-slate-900 dark:text-white">
            Agrégation du tableau de bord géodécisionnel...
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Croisement des rasters GeoTIFF, des données DWH et des flux GDACS.
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Indice National de Risque',
      value: formatNumber(summary?.riskMeanNational, 1),
      suffix: '/100',
      subtitle: `Score composite moyen pondéré AHP`,
      icon: <TrendingUp size={20} />,
      tone: getRiskScoreTone(summary?.riskMeanNational),
    },
    {
      title: 'Population Exposée Estimée',
      value: formatPopulation(summary?.populationExposed),
      subtitle: 'Croisement raster WorldPop × Aléas',
      icon: <Users size={20} />,
      tone: 'blue' as const,
    },
    {
      title: 'Zones en Alerte Critique',
      value: String(summary?.elevatedOrCriticalZones ?? 0),
      subtitle: `${summary?.criticalZones ?? 0} zones en seuil critique (>75)`,
      icon: <ShieldAlert size={20} />,
      tone: (summary?.criticalZones ?? 0) > 0 ? ('red' as const) : ('green' as const),
    },
    {
      title: 'Point Chaud Territorial N°1',
      value: topVulnerableZone ? topVulnerableZone.zoneNom : 'Non défini',
      subtitle: topVulnerableZone ? `Score max ${formatNumber(topVulnerableZone.riskMax, 1)}/100 (${riskShortLabels[topVulnerableZone.riskType] ?? topVulnerableZone.riskType})` : 'Aucune zone à risque élevé',
      icon: <MapPinned size={20} />,
      tone: 'orange' as const,
    },
    {
      title: 'Couches Rasters DWH',
      value: String(summary?.activeRasters ?? rasters.length ?? 0),
      subtitle: `Dernier sync : ${formatShortDate(summary?.latestRasterUpdate)}`,
      icon: <Layers size={20} />,
      tone: 'green' as const,
    },
    {
      title: 'Flux de Données Connectés',
      value: `${connectedSources}/${totalSources}`,
      subtitle: summary?.failedSources ? `${summary.failedSources} source en erreur` : 'Toutes les sources opérationnelles',
      icon: <RadioTower size={20} />,
      tone: summary?.failedSources ? ('orange' as const) : ('purple' as const),
    },
  ];

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden">
      {/* 1. Header with navigation shortcuts */}
      <PageHeader
        title="Tableau de bord géodécisionnel"
        subtitle="Tour de contrôle multi-risques de Madagascar : alertes temps réel, modèle AHP, rasters satellitaires et forage spatial SOLAP."
        icon={<BarChart3 size={28} className="text-riskgreen" />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/carte')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              <MapIcon size={16} />
              <span>Carte Interactive</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/analyse')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Calibrer la matrice de Saaty AHP"
            >
              <Sliders size={16} className="text-blue-500" />
              <span>Modèle AHP</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/analyse/solap')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Explorer le cube SOLAP multidimensionnel"
            >
              <Database size={16} className="text-emerald-500" />
              <span>SOLAP</span>
            </button>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Rafraîchir les données"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        }
      />

      {/* 2. GDACS Cyclone / National Vigilance Live Banner */}
      {activeCyclones.length > 0 ? (
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-rose-500/30 bg-gradient-to-r from-rose-950 via-rose-900 to-red-900 p-5 text-white shadow-xl shadow-rose-950/20">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl animate-pulse" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg animate-bounce">
                <CloudLightning size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-500/30 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-rose-200 border border-rose-400/40">
                    Alerte Cyclone GDACS Active
                  </span>
                  <span className="text-xs text-rose-200/80">
                    {activeCyclones.length} système(s) détecté(s)
                  </span>
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  {activeCyclones.map((c) => c.name).join(', ')} — Alerte Météorologique en cours
                </div>
                <div className="mt-1 text-xs text-rose-100 flex flex-wrap gap-4">
                  {activeCyclones.map((c) => (
                    <span key={c.id}>
                      <strong>{c.name}</strong> ({c.severityLevel}) • Vents : {c.windSpeed || 'N/A'} • Détecté le : {formatShortDate(c.fetchedAt)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/carte')}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-rose-950 shadow-lg hover:bg-rose-50 transition"
            >
              <span>Suivre la trajectoire sur la carte</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Vigilance Météorologique & GDACS
                  </span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Situation sous contrôle — Aucun cyclone majeur actif menaçant les côtes malgaches
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 text-right shrink-0">
              Veille GDACS & NASA POWER 24/7
            </div>
          </div>
        </section>
      )}

      {/* 3. Strategic 6 KPIs Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      {/* 4. Interactive Quick-Filter Bar (SOLAP Slice & Dice) */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-black text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <Filter size={12} />
              <span>Filtrage Décisionnel SOLAP</span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Filtrer les indicateurs par aléa & granularité territoriale
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Risk Pills */}
            <div className="flex flex-wrap items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              {[
                { value: '', label: 'Tous les risques', icon: '🌍' },
                { value: 'FLOOD', label: 'Inondation', icon: '🌊' },
                { value: 'DROUGHT', label: 'Sécheresse', icon: '☀️' },
                { value: 'CYCLONE', label: 'Cyclone', icon: '🌀' },
                { value: 'LANDSLIDE', label: 'Glissement', icon: '🏔️' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedRiskType(item.value)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                    selectedRiskType === item.value
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  ].join(' ')}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Zone Level Pills (Drill-down / Roll-up) */}
            <div className="flex items-center rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              {[
                { value: 'region', label: '23 Régions' },
                { value: 'district', label: '119 Districts' },
                { value: 'commune', label: '1 579 Communes' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedZoneType(item.value)}
                  className={[
                    'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                    selectedZoneType === item.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Navigation Tabs */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Donut Chart Risk Levels */}
            <SectionCard
              title="Répartition des Niveaux de Risque"
              subtitle={`Agrégation spatiale sur les ${distributionTotal} entités (${selectedZoneType})`}
              actions={<Activity className="text-slate-400" size={20} />}
              className="xl:col-span-1"
            >
              <div className="flex flex-col items-center justify-center gap-5 pt-2">
                <div
                  className="relative mx-auto h-40 w-40 rounded-full shadow-md"
                  style={{ background: distributionGradient }}
                >
                  <div className="absolute inset-10 rounded-full bg-white dark:bg-slate-900 shadow-inner" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-black text-slate-950 dark:text-white">
                        {distributionTotal}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Entités
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-2">
                  {distributionItems.map((item) => (
                    <div
                      key={item.key}
                      className={[
                        'flex items-center justify-between rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800 transition',
                        item.bg,
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={['h-2.5 w-2.5 rounded-full', item.color].join(' ')} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                          {item.pct}%
                        </span>
                        <span className={['text-xs font-black', item.text].join(' ')}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* Time Series Evolution */}
            <SectionCard
              title="Évolution Temporelle du Risque (SOLAP / DWH)"
              subtitle={`Rétrospective pluriannuelle — Type : ${riskLabels[selectedRiskType || 'GLOBAL'] || selectedRiskType}`}
              actions={
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {selectedRiskType || 'GLOBAL'}
                </span>
              }
              className="xl:col-span-2"
            >
              <SimpleLineChart points={linePoints} />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Risk by Hazard Type Bar Chart */}
            <SectionCard
              title="Intensité Moyenne par Aléa"
              subtitle="Score régional maximum moyen par type de risque"
              actions={<BarChart3 className="text-slate-400" size={20} />}
              className="xl:col-span-1"
            >
              <SimpleBarChart items={riskTypeBars} />
            </SectionCard>

            {/* Top Vulnerable Zones Table */}
            <SectionCard
              title={`Top ${topZones.length} des Territoires les Plus Vulnérables`}
              subtitle={`Classé par score de risque décroissant (${selectedZoneType})`}
              actions={
                <button
                  type="button"
                  onClick={() => navigate('/carte')}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <span>Voir sur la carte</span>
                  <ExternalLink size={14} />
                </button>
              }
              className="xl:col-span-2"
            >
              <div className="max-h-[380px] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5">#</th>
                      <th className="px-3.5 py-2.5">Aléa</th>
                      <th className="px-3.5 py-2.5">Zone Administrative</th>
                      <th className="px-3.5 py-2.5 text-right">Pop. Exposée</th>
                      <th className="px-3.5 py-2.5 text-center">Score de Risque</th>
                      <th className="px-3.5 py-2.5 text-right">Niveau</th>
                      <th className="px-3.5 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topZones.map((zone, index) => {
                      const score = zone.riskMax ?? zone.riskMean ?? 0;
                      return (
                        <tr
                          key={`${zone.riskType}-${zone.zoneId}-${index}`}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <td className="px-3.5 py-2.5 text-xs font-black text-slate-400">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={[
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-black',
                                riskTypeClasses[zone.riskType] ??
                                  'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                              ].join(' ')}
                            >
                              <span>{riskTypeIcons[zone.riskType] || '📍'}</span>
                              <span>{riskShortLabels[zone.riskType] ?? zone.riskType}</span>
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {zone.zoneNom}
                            </div>
                            {zone.zoneCode && (
                              <div className="text-[10px] text-slate-400">Code : {zone.zoneCode}</div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {formatPopulation(zone.populationExposed)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={[
                                    'h-full rounded-full',
                                    score > 75 ? 'bg-rose-500' : score > 50 ? 'bg-orange-500' : score > 25 ? 'bg-amber-500' : 'bg-emerald-500',
                                  ].join(' ')}
                                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-100 w-8 text-right">
                                {formatNumber(score, 1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <span
                              className={[
                                'rounded-full border px-2 py-0.5 text-xs font-black',
                                riskLevelClasses[zone.riskLevel ?? ''] ??
                                  'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                              ].join(' ')}
                            >
                              {riskLevelLabels[zone.riskLevel ?? ''] ?? '—'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`/carte`)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition"
                              title="Centrer la carte sur cette zone"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Traceability & Methodology Footnote */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>
                  <strong>Méthodologie AHP de Saaty & PostGIS Star Schema :</strong> Pondérations multicritères validées (Ratio de cohérence $CR &lt; 10\%$). Données recalculées automatiquement via le pipeline ETL et le Data Warehouse spatial.
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/parametres/poids-ahp')}
                className="shrink-0 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Consulter la matrice Saaty →
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: REGIONAL COMPARISON */}
      {activeTab === 'regions' && (
        <SectionCard
          title="Matrice Comparative Multi-Risques des 23 Régions"
          subtitle="Scores maximaux par aléa issus de la vue matérialisée dwh.mv_regional_risk_summary."
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">23 Régions</span>
              <MapPinned className="text-slate-400" size={18} />
            </div>
          }
        >
          <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Région</th>
                  <th className="px-4 py-3 text-center">🌐 Risque Global</th>
                  <th className="px-4 py-3 text-center">🌊 Inondation</th>
                  <th className="px-4 py-3 text-center">☀️ Sécheresse</th>
                  <th className="px-4 py-3 text-center">🏔️ Glissement</th>
                  <th className="px-4 py-3 text-center">🌀 Cyclone</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {riskByRegion.map((region) => (
                  <tr
                    key={region.zoneId}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                      {region.zoneNom}
                    </td>
                    {['GLOBAL', 'FLOOD', 'DROUGHT', 'LANDSLIDE', 'CYCLONE'].map((riskType) => {
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
                    })}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate('/carte')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1"
                      >
                        <Eye size={14} />
                        <span>Carte</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* TAB 3: SOURCES & ETL */}
      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Flux & Sources de Données Réelles"
            subtitle="État des connecteurs satellitaires, climatiques et vectoriels."
            actions={<RadioTower size={20} className="text-slate-400" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sources.map((source) => (
                <div
                  key={source.code}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4 transition hover:border-emerald-200"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-900 dark:text-white">
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
            title="Traçabilité des Traitements ETL"
            subtitle="Historique des exécutions du pipeline de données spatiales."
            actions={<Activity size={20} className="text-slate-400" />}
          >
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {etlJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-900 dark:text-white">
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
                      Durée d’exécution : {(job.durationMs / 1000).toFixed(1)} s
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* TAB 4: CLIMATE & RASTERS */}
      {activeTab === 'climate' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Indicateurs Météorologiques Live (NASA POWER)"
            subtitle="Moyenne climatique récente sur Madagascar."
            actions={<CloudSun size={20} className="text-slate-400" />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {climate && (
                <>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      <Thermometer size={18} className="text-amber-500" />
                      <span>{climate.temperature.label}</span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                      {climate.temperature.value === null
                        ? 'Indisponible'
                        : `${formatNumber(climate.temperature.value, 1)} ${climate.temperature.unit}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">Source : {climate.temperature.source}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      <Droplets size={18} className="text-blue-500" />
                      <span>{climate.humidity.label}</span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                      {climate.humidity.value === null
                        ? 'Indisponible'
                        : `${formatNumber(climate.humidity.value, 1)} ${climate.humidity.unit}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">Source : {climate.humidity.source}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      <Wind size={18} className="text-teal-500" />
                      <span>{climate.wind.label}</span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                      {climate.wind.value === null
                        ? 'Indisponible'
                        : `${formatNumber(climate.wind.value, 1)} ${climate.wind.unit}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">Source : {climate.wind.source}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      <CloudRain size={18} className="text-indigo-500" />
                      <span>{climate.precipitation.label}</span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                      {climate.precipitation.value === null
                        ? 'Indisponible'
                        : `${formatNumber(climate.precipitation.value, 1)} ${climate.precipitation.unit}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">Source : {climate.precipitation.source}</div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Dernier relevé : {formatDate(climate?.date)}
            </div>
          </SectionCard>

          <SectionCard
            title="Catalogue des Rasters GeoTIFF Actifs"
            subtitle="Couches matricielles exploitées pour le calcul du risque composite."
            actions={<Layers size={20} className="text-slate-400" />}
          >
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {rasters.slice(0, 12).map((raster) => (
                <div
                  key={`${raster.type}-${raster.filePath}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-4"
                >
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">
                      {raster.name}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {raster.type}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    Max : {formatNumber(raster.maxValue, 1)}
                    <br />
                    {formatShortDate(raster.createdAt ?? raster.updatedAt)}
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
