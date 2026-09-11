import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  HardDrive,
  Info,
  Layers,
  MapPin,
  RadioTower,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import Tabs from '../../../shared/components/ui/Tabs';
import {
  GeneratedReport,
  RiskComparisonRow,
  reportsService,
} from '../services/reports.service';

type ReportAction = {
  title: string;
  description: string;
  format: 'PDF' | 'XLSX' | 'CSV';
  category: 'national' | 'zones' | 'sources' | 'etl';
  icon: typeof FileText;
  action: () => Promise<void>;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;
type ReportsTab = 'catalog' | 'history' | 'comparison';

const riskOptions = [
  { id: 'FLOOD', label: 'Inondation', icon: '🌊' },
  { id: 'DROUGHT', label: 'Sécheresse', icon: '☀️' },
  { id: 'LANDSLIDE', label: 'Glissement de terrain', icon: '🏔️' },
  { id: 'CYCLONE', label: 'Cyclone', icon: '🌀' },
];

const riskFullLabels: Record<string, string> = {
  '': 'tous les aléas',
  GLOBAL: 'le risque global composite',
  FLOOD: 'le risque inondation',
  DROUGHT: 'le risque sécheresse',
  LANDSLIDE: 'le risque glissement de terrain',
  CYCLONE: 'le risque cyclonique',
};

const reportTypeLabels: Record<string, string> = {
  national: 'Rapport national',
  region: 'Rapport régional',
  district: 'Rapport par district',
  commune: 'Rapport communal',
  custom: 'Rapport personnalisé',
};

const periodLabels: Record<string, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  custom: 'Période personnalisée',
};

const zoneLevelLabels: Record<string, string> = {
  madagascar: 'Madagascar',
  region: 'Région (22)',
  district: 'District (110)',
  commune: 'Commune (1 433)',
};

const elementOptions = [
  'Carte raster & GeoTIFF',
  'Carte administrative',
  'Histogrammes par aléa',
  'Courbes temporelles SOLAP',
  'Tableau statistique DWH',
  'Historique des alertes',
  'Indicateurs météo NASA POWER',
  'Population exposée WorldPop',
  'Méthodologie AHP Saaty',
  'Traçabilité des sources',
];

function formatReportDate(value?: string | null) {
  if (!value) return '—';
  const cleanedValue = String(value).trim().replace(' ', 'T');
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(cleanedValue);
  const normalizedValue = hasTimezone ? cleanedValue : `${cleanedValue}Z`;

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Indian/Antananarivo',
  }).format(date);
}

function formatSimpleDate(val: string) {
  if (!val) return '—';
  const parts = val.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

function formatDelta(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(1)}`;
}

function formatComparisonValue(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value).toFixed(1);
}

function formatFileSize(value?: number | null) {
  if (!value || value <= 0) return '—';
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} Mo`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} Ko`;
  }
  return `${value} o`;
}

function getFormatBadge(format: string) {
  const f = format.toUpperCase();
  if (f === 'PDF') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
        <FileText size={12} />
        <span>PDF</span>
      </span>
    );
  }
  if (f === 'XLSX' || f === 'EXCEL') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
        <FileSpreadsheet size={12} />
        <span>XLSX</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
      <BarChart3 size={12} />
      <span>CSV</span>
    </span>
  );
}

function ChoiceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-4 py-3 text-left text-xs font-bold transition',
        active
          ? 'border-purple-400 bg-purple-50 text-purple-900 dark:border-purple-600 dark:bg-purple-950/50 dark:text-purple-200 shadow-xs'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-purple-300',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export default function RapportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportsTab>('comparison');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [loadingWizard, setLoadingWizard] = useState(false);

  // History & Filters
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFormatFilter, setHistoryFormatFilter] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Comparison State
  const [comparisonRows, setComparisonRows] = useState<RiskComparisonRow[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [periodAStart, setPeriodAStart] = useState('2026-01-01');
  const [periodAEnd, setPeriodAEnd] = useState('2026-03-31');
  const [periodBStart, setPeriodBStart] = useState('2026-06-01');
  const [periodBEnd, setPeriodBEnd] = useState('2026-09-09');
  const [comparisonRiskType, setComparisonRiskType] = useState('DROUGHT');
  const [comparisonZoneType, setComparisonZoneType] = useState('region');
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [comparisonTrendFilter, setComparisonTrendFilter] = useState<'all' | 'up' | 'down' | 'new'>('all');
  const [comparisonPage, setComparisonPage] = useState(1);
  const [comparisonPageSize, setComparisonPageSize] = useState(10);

  // Track the exact parameters for which the current result was computed
  const [appliedComparison, setAppliedComparison] = useState({
    periodAStart: '2026-01-01',
    periodAEnd: '2026-03-31',
    periodBStart: '2026-06-01',
    periodBEnd: '2026-09-09',
    riskType: 'DROUGHT',
    zoneType: 'region',
  });

  // Wizard State
  const [reportType, setReportType] = useState('national');
  const [period, setPeriod] = useState('30d');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([
    'FLOOD',
    'DROUGHT',
    'LANDSLIDE',
    'CYCLONE',
  ]);
  const [zoneLevel, setZoneLevel] = useState('madagascar');
  const [selectedElements, setSelectedElements] = useState<string[]>(elementOptions);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await reportsService.getHistory(100);
      setHistory(response || []);
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadComparison = async (override?: {
    pAStart?: string;
    pAEnd?: string;
    pBStart?: string;
    pBEnd?: string;
    risk?: string;
    zone?: string;
  }) => {
    setComparisonLoading(true);
    const pAStart = override?.pAStart ?? periodAStart;
    const pAEnd = override?.pAEnd ?? periodAEnd;
    const pBStart = override?.pBStart ?? periodBStart;
    const pBEnd = override?.pBEnd ?? periodBEnd;
    const rType = override?.risk ?? comparisonRiskType;
    const zType = override?.zone ?? comparisonZoneType;

    try {
      const rows = await reportsService.getRiskComparison({
        periodAStart: pAStart,
        periodAEnd: pAEnd,
        periodBStart: pBStart,
        periodBEnd: pBEnd,
        riskType: rType || undefined,
        zoneType: zType,
      });
      setComparisonRows(rows || []);
      setComparisonPage(1);
      setAppliedComparison({
        periodAStart: pAStart,
        periodAEnd: pAEnd,
        periodBStart: pBStart,
        periodBEnd: pBEnd,
        riskType: rType,
        zoneType: zType,
      });
    } catch (err) {
      console.error('Erreur calcul comparaison:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadHistoryReport = async (report: GeneratedReport) => {
    setDownloadingId(report.id);
    try {
      await reportsService.downloadHistory(report);
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteHistoryReport = async (id: string) => {
    if (!window.confirm('Voulez-vous supprimer définitivement ce rapport de l’historique ?')) {
      return;
    }
    setDeletingId(id);
    try {
      await reportsService.deleteHistory(id);
      await loadHistory();
    } finally {
      setDeletingId(null);
    }
  };

  const downloadComparisonExcel = async () => {
    await reportsService.downloadRiskComparisonExcel({
      periodAStart: appliedComparison.periodAStart,
      periodAEnd: appliedComparison.periodAEnd,
      periodBStart: appliedComparison.periodBStart,
      periodBEnd: appliedComparison.periodBEnd,
      riskType: appliedComparison.riskType || undefined,
      zoneType: appliedComparison.zoneType,
    });
    await loadHistory();
  };

  // Catalogue Actions
  const reports: ReportAction[] = [
    {
      title: 'Rapport National Multi-Risques',
      description:
        'Synthèse décisionnelle officielle en PDF avec indicateurs zonaux, top zones, traçabilité ETL et cartographie.',
      format: 'PDF',
      category: 'national',
      icon: FileText,
      action: () => reportsService.downloadNationalPdf(),
    },
    {
      title: 'Classeur Multi-Risques National',
      description:
        'Classeur Excel complet multi-feuilles avec statistiques zonales, découpages administratifs et métriques DWH.',
      format: 'XLSX',
      category: 'national',
      icon: FileSpreadsheet,
      action: () => reportsService.downloadNationalExcel(),
    },
    {
      title: 'Top Zones Exposées (PDF)',
      description:
        'Fiche décisionnelle PDF résumant les territoires à risque maximal élevé et critique pour les interventions BNGRC.',
      format: 'PDF',
      category: 'zones',
      icon: FileText,
      action: () =>
        reportsService.downloadTopRiskZonesPdf({
          zoneType: 'region',
          limit: 50,
        }),
    },
    {
      title: 'Top Zones Exposées (Excel)',
      description:
        'Tableau tabulaire Excel des 100 territoires les plus vulnérables avec scores moyens, maximaux et population exposée.',
      format: 'XLSX',
      category: 'zones',
      icon: Layers,
      action: () =>
        reportsService.downloadTopRiskZonesExcel({
          zoneType: 'region',
          limit: 100,
        }),
    },
    {
      title: 'Synthèse des Indicateurs DWH',
      description:
        'Export CSV brut de la table de faits fact_risk_indicator pour intégration dans un SIG ou outil de BI externe.',
      format: 'CSV',
      category: 'national',
      icon: BarChart3,
      action: () => reportsService.downloadRiskSummaryCsv(),
    },
    {
      title: 'Audit des Sources de Données',
      description:
        'Rapport Excel de l’état des flux satellitaires et météorologiques (NASA, CHIRPS, GDACS, WorldPop, OSM).',
      format: 'XLSX',
      category: 'sources',
      icon: RadioTower,
      action: () => reportsService.downloadDataSourcesExcel(),
    },
    {
      title: 'Journal des Traitements ETL',
      description:
        'Fichier CSV traçant l’historique des calculs d’indicateurs, durées d’exécution et statuts des pipelines.',
      format: 'CSV',
      category: 'etl',
      icon: Database,
      action: () => reportsService.downloadEtlJobsCsv(),
    },
  ];

  // History Computations
  const totalStorageBytes = useMemo(() => {
    return history.reduce((sum, item) => sum + (Number(item.fileSizeBytes) || 0), 0);
  }, [history]);

  const latestReport = useMemo(() => {
    if (!history.length) return null;
    return history[0];
  }, [history]);

  const filteredHistory = useMemo(() => {
    let list = history;

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.fileName?.toLowerCase().includes(q) ||
          r.reportType?.toLowerCase().includes(q),
      );
    }

    if (historyFormatFilter) {
      list = list.filter((r) => r.format?.toUpperCase() === historyFormatFilter.toUpperCase());
    }

    if (historyTypeFilter) {
      list = list.filter((r) => r.reportType === historyTypeFilter);
    }

    return list;
  }, [history, historySearch, historyFormatFilter, historyTypeFilter]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

  // Comparison Computations
  const comparisonStats = useMemo(() => {
    const total = comparisonRows.length;
    const withBaselineA = comparisonRows.filter((r) => r.riskMaxA !== null && r.riskMaxA !== undefined).length;
    const newInB = comparisonRows.filter((r) => (r.riskMaxA === null || r.riskMaxA === undefined) && r.riskMaxB !== null).length;
    const up = comparisonRows.filter((r) => Number(r.riskMaxDelta) > 0).length;
    const down = comparisonRows.filter((r) => Number(r.riskMaxDelta) < 0).length;
    const maxBRow = [...comparisonRows].sort((a, b) => (Number(b.riskMaxB) || 0) - (Number(a.riskMaxB) || 0))[0];

    return {
      total,
      withBaselineA,
      newInB,
      up,
      down,
      topZone: maxBRow ? `${maxBRow.zoneNom} (${Number(maxBRow.riskMaxB).toFixed(1)})` : '—',
    };
  }, [comparisonRows]);

  const filteredComparisonRows = useMemo(() => {
    let list = comparisonRows;

    if (comparisonSearch.trim()) {
      const q = comparisonSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.zoneNom?.toLowerCase().includes(q) ||
          r.zoneId?.toLowerCase().includes(q) ||
          r.riskLabel?.toLowerCase().includes(q),
      );
    }

    if (comparisonTrendFilter === 'up') {
      list = list.filter((r) => Number(r.riskMaxDelta) > 0);
    } else if (comparisonTrendFilter === 'down') {
      list = list.filter((r) => Number(r.riskMaxDelta) < 0);
    } else if (comparisonTrendFilter === 'new') {
      list = list.filter((r) => (r.riskMaxA === null || r.riskMaxA === undefined) && r.riskMaxB !== null);
    }

    return list;
  }, [comparisonRows, comparisonSearch, comparisonTrendFilter]);

  const totalComparisonPages = Math.max(1, Math.ceil(filteredComparisonRows.length / comparisonPageSize));
  const paginatedComparison = useMemo(() => {
    const start = (comparisonPage - 1) * comparisonPageSize;
    return filteredComparisonRows.slice(start, start + comparisonPageSize);
  }, [filteredComparisonRows, comparisonPage, comparisonPageSize]);

  // Wizard Generation
  const toggleRisk = (risk: string) => {
    setSelectedRisks((cur) =>
      cur.includes(risk) ? cur.filter((r) => r !== risk) : [...cur, risk],
    );
  };

  const toggleElement = (el: string) => {
    setSelectedElements((cur) =>
      cur.includes(el) ? cur.filter((e) => e !== el) : [...cur, el],
    );
  };

  const generateWizardReport = async () => {
    setLoadingWizard(true);
    try {
      const targetZone =
        reportType === 'commune' || zoneLevel === 'commune'
          ? 'commune'
          : reportType === 'district' || zoneLevel === 'district'
            ? 'district'
            : 'region';
      const targetRisk = selectedRisks.length === 1 ? selectedRisks[0] : undefined;

      if (reportType === 'national' && zoneLevel === 'madagascar') {
        await reportsService.downloadNationalPdf();
      } else {
        await reportsService.downloadTopRiskZonesPdf({
          zoneType: targetZone,
          riskType: targetRisk,
          limit: 100,
        });
      }

      await loadHistory();
      setWizardOpen(false);
      setStep(1);
    } finally {
      setLoadingWizard(false);
    }
  };

  const tabs = [
    { id: 'comparison' as const, label: 'Comparateur de périodes multi-risques', count: comparisonRows.length },
    { id: 'history' as const, label: 'Historique des rapports archivés', count: history.length },
    { id: 'catalog' as const, label: 'Catalogue des exports', count: reports.length },
  ];

  const formattedRiskName = riskFullLabels[appliedComparison.riskType] || 'tous les aléas';
  const formattedDateA = `${formatSimpleDate(appliedComparison.periodAStart)} au ${formatSimpleDate(appliedComparison.periodAEnd)}`;
  const formattedDateB = `${formatSimpleDate(appliedComparison.periodBStart)} au ${formatSimpleDate(appliedComparison.periodBEnd)}`;

  return (
    <div className="space-y-6">
      {/* 1. Page Header with CTA */}
      <PageHeader
        title="Génération & Comparaison des Rapports"
        subtitle="Exports officiels multi-risques pour les décideurs (BNGRC, Ministères) au format PDF, Excel et CSV."
        icon={<FileText size={30} className="text-purple-600" />}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-purple-700"
            >
              <Sparkles size={16} />
              <span>Générateur Sur-Mesure</span>
            </button>
            <button
              type="button"
              onClick={() => {
                loadHistory();
                loadComparison();
              }}
              disabled={historyLoading || comparisonLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              title="Actualiser les données"
            >
              <RefreshCw size={15} className={historyLoading || comparisonLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      {/* 2. Top Dynamic Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Zones Comparées
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
              <MapPin size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {comparisonStats.total} {appliedComparison.zoneType === 'region' ? 'Régions' : appliedComparison.zoneType === 'district' ? 'Districts' : 'Communes'}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {appliedComparison.riskType ? `Aléa actif : ${appliedComparison.riskType}` : 'Tous aléas confondus'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Point Chaud Période B
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 truncate text-lg font-black text-rose-600 dark:text-rose-400" title={comparisonStats.topZone}>
            {comparisonStats.topZone}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Score maximal observé en Période B
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Rapports Archivés
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {history.length} générés
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Stockage : {formatFileSize(totalStorageBytes)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Dernier Export Réalisé
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white" title={latestReport?.title || 'Aucun export'}>
            {latestReport ? latestReport.title : 'Aucun export'}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {latestReport ? formatReportDate(latestReport.createdAt) : 'En attente de génération'}
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <Tabs active={activeTab} onChange={setActiveTab} tabs={tabs} />

      {/* ======================================================================= */}
      {/* TAB 1: COMPARAISON DE PÉRIODES (FULL WIDTH)                             */}
      {/* ======================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          {/* Formulaire de paramètres de comparaison */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Activity size={16} className="text-purple-600" />
              <span>Paramètres de Comparaison Temporelle DWH</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Comparez l'évolution spatiotemporelle des scores d'aléas et de la population exposée entre deux fenêtres temporelles.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Période A — Début (Référence)
                <input
                  type="date"
                  value={periodAStart}
                  onChange={(e) => setPeriodAStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>

              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Période A — Fin
                <input
                  type="date"
                  value={periodAEnd}
                  onChange={(e) => setPeriodAEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>

              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Période B — Début (Cible)
                <input
                  type="date"
                  value={periodBStart}
                  onChange={(e) => setPeriodBStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>

              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Période B — Fin
                <input
                  type="date"
                  value={periodBEnd}
                  onChange={(e) => setPeriodBEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={comparisonRiskType}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setComparisonRiskType(nextVal);
                    loadComparison({ risk: nextVal });
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="">Tous les aléas</option>
                  <option value="DROUGHT">Sécheresse</option>
                  <option value="FLOOD">Inondation</option>
                  <option value="CYCLONE">Cyclone</option>
                  <option value="LANDSLIDE">Glissement de terrain</option>
                  <option value="GLOBAL">Global Composite</option>
                </select>

                <select
                  value={comparisonZoneType}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setComparisonZoneType(nextVal);
                    loadComparison({ zone: nextVal });
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="region">Régions (22)</option>
                  <option value="district">Districts (110)</option>
                  <option value="commune">Communes (1 433)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadComparison()}
                  disabled={comparisonLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition"
                >
                  <RefreshCw size={14} className={comparisonLoading ? 'animate-spin' : ''} />
                  <span>Calculer la comparaison</span>
                </button>

                {comparisonRows.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadComparisonExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition"
                  >
                    <Download size={14} />
                    <span>Exporter XLSX</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bandeau d'interprétation 100% dynamique */}
          {comparisonStats.total === 0 && !comparisonLoading ? (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Aucune observation archivée :</div>
                <p className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
                  Aucun enregistrement n'a été trouvé pour <strong>{formattedRiskName}</strong> entre le <strong>{formattedDateA}</strong> et le <strong>{formattedDateB}</strong>.
                </p>
              </div>
            </div>
          ) : comparisonStats.newInB > 0 && comparisonStats.withBaselineA === 0 ? (
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
              <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Ligne de référence initiale (Baseline) pour {formattedRiskName} :</div>
                <p className="mt-0.5 text-blue-800/80 dark:text-blue-300/80">
                  La Période A (du <strong>{formattedDateA}</strong>) ne comporte pas d'historique archivé pour <strong>{formattedRiskName}</strong>. Les {comparisonStats.total} scores observés en Période B (du <strong>{formattedDateB}</strong>) constituent ainsi la <strong>ligne de référence initiale du Data Warehouse</strong>.
                </p>
              </div>
            </div>
          ) : comparisonStats.withBaselineA > 0 ? (
            <div className="rounded-2xl border border-purple-200/60 bg-purple-50/70 p-4 dark:border-purple-900/40 dark:bg-purple-950/30 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
              <TrendingUp size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Bilan comparatif ({formattedDateA} ➔ {formattedDateB}) :</div>
                <p className="mt-0.5 text-purple-800/80 dark:text-purple-300/80">
                  Analyse de <strong>{formattedRiskName}</strong> sur {comparisonStats.total} {appliedComparison.zoneType === 'region' ? 'régions' : 'zones'} : <strong>{comparisonStats.up} zone(s) en aggravation</strong> ($\Delta &gt; 0$), <strong>{comparisonStats.down} zone(s) en amélioration</strong> ($\Delta &lt; 0$).
                </p>
              </div>
            </div>
          ) : null}

          {/* Filtres & Barre de recherche de la table de comparaison */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* Recherche */}
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer par région, nom..."
                    value={comparisonSearch}
                    onChange={(e) => {
                      setComparisonSearch(e.target.value);
                      setComparisonPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>

                {/* Filtres de tendance */}
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                  {[
                    { key: 'all' as const, label: `Tous (${comparisonRows.length})` },
                    { key: 'up' as const, label: `En hausse (${comparisonStats.up})` },
                    { key: 'down' as const, label: `En baisse (${comparisonStats.down})` },
                    { key: 'new' as const, label: `Mesures B (${comparisonStats.newInB})` },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setComparisonTrendFilter(f.key);
                        setComparisonPage(1);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        comparisonTrendFilter === f.key
                          ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-900 dark:text-purple-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélecteur de taille de page */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Lignes :</span>
                <select
                  value={comparisonPageSize}
                  onChange={(e) => {
                    setComparisonPageSize(Number(e.target.value));
                    setComparisonPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tableau Comparatif Pleine Largeur */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {filteredComparisonRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-black text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="p-3.5">Zone Administrative</th>
                      <th className="p-3.5">Aléa</th>
                      <th className="p-3.5 text-center">Score Période A</th>
                      <th className="p-3.5 text-center">Score Période B</th>
                      <th className="p-3.5 text-center">Évolution (Δ Max)</th>
                      <th className="p-3.5 text-right">Pop. Exposée A</th>
                      <th className="p-3.5 text-right">Pop. Exposée B</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedComparison.map((row, idx) => {
                      const hasA = row.riskMaxA !== null && row.riskMaxA !== undefined;
                      const hasB = row.riskMaxB !== null && row.riskMaxB !== undefined;
                      const delta = Number(row.riskMaxDelta ?? 0);

                      return (
                        <tr
                          key={`${row.zoneId}-${row.riskType}-${idx}`}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/60"
                        >
                          <td className="p-3.5 font-black text-slate-900 dark:text-white">
                            {row.zoneNom}
                          </td>
                          <td className="p-3.5">
                            <span className="rounded-md bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                              {row.riskLabel || row.riskType}
                            </span>
                          </td>

                          {/* Score A */}
                          <td className="p-3.5 text-center">
                            {hasA ? (
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {formatComparisonValue(row.riskMaxA)}
                              </span>
                            ) : (
                              <span className="rounded px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-400 dark:bg-slate-800">
                                N/A (Non archivé)
                              </span>
                            )}
                          </td>

                          {/* Score B */}
                          <td className="p-3.5 text-center">
                            {hasB ? (
                              <span className="inline-block rounded-lg px-2.5 py-1 text-xs font-black bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200">
                                {formatComparisonValue(row.riskMaxB)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Évolution Delta */}
                          <td className="p-3.5 text-center font-black">
                            {hasA && hasB ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black ${
                                  delta > 0
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                                    : delta < 0
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {delta > 0 ? <TrendingUp size={13} /> : delta < 0 ? <TrendingDown size={13} /> : null}
                                <span>{formatDelta(delta)}</span>
                              </span>
                            ) : !hasA && hasB ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                <span>🆕 Référence ({formatComparisonValue(row.riskMaxB)})</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Population A */}
                          <td className="p-3.5 text-right text-slate-500">
                            {row.populationExposedA ? Number(row.populationExposedA).toLocaleString('fr-FR') : '—'}
                          </td>

                          {/* Population B */}
                          <td className="p-3.5 text-right font-bold text-slate-800 dark:text-slate-200">
                            {row.populationExposedB ? `${Number(row.populationExposedB).toLocaleString('fr-FR')} hab.` : '—'}
                          </td>

                          {/* Action */}
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => navigate('/carte')}
                              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 inline-flex items-center gap-1 font-bold"
                              title="Voir la région sur la carte"
                            >
                              <Eye size={14} />
                              <span>Carte</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500">
                {comparisonLoading
                  ? 'Calcul de la comparaison temporelle en cours...'
                  : 'Aucune donnée trouvée pour les filtres sélectionnés.'}
              </div>
            )}

            {/* Pagination du tableau comparatif */}
            {totalComparisonPages > 1 && (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
                <div>
                  Affichage de{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {(comparisonPage - 1) * comparisonPageSize + 1}
                  </strong>{' '}
                  à{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {Math.min(comparisonPage * comparisonPageSize, filteredComparisonRows.length)}
                  </strong>{' '}
                  sur <strong className="text-slate-900 dark:text-white">{filteredComparisonRows.length}</strong> entités
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setComparisonPage(1)}
                    disabled={comparisonPage === 1}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonPage((p) => Math.max(1, p - 1))}
                    disabled={comparisonPage === 1}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                    Page {comparisonPage} / {totalComparisonPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setComparisonPage((p) => Math.min(totalComparisonPages, p + 1))}
                    disabled={comparisonPage === totalComparisonPages}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonPage(totalComparisonPages)}
                    disabled={comparisonPage === totalComparisonPages}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: HISTORIQUE ET ARCHIVES (FULL WIDTH)                              */}
      {/* ======================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre, fichier..."
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                  {[
                    { value: '', label: 'Tous formats' },
                    { value: 'PDF', label: 'PDF' },
                    { value: 'XLSX', label: 'Excel' },
                    { value: 'CSV', label: 'CSV' },
                  ].map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        setHistoryFormatFilter(f.value);
                        setHistoryPage(1);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        historyFormatFilter === f.value
                          ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-900 dark:text-purple-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <select
                  value={historyTypeFilter}
                  onChange={(e) => {
                    setHistoryTypeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="">Tous les types</option>
                  <option value="NATIONAL">National</option>
                  <option value="TOP_RISK_ZONES">Top Zones</option>
                  <option value="RISK_SUMMARY">Synthèse DWH</option>
                  <option value="DATA_SOURCES">Sources</option>
                  <option value="ETL_JOBS">ETL Jobs</option>
                  <option value="RISK_COMPARISON">Comparaisons</option>
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  <strong>{filteredHistory.length}</strong> rapport(s) archivé(s)
                </span>
                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {historyLoading ? 'Actualisation...' : 'Actualiser'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-black text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="p-3.5">Document / Titre</th>
                      <th className="p-3.5">Type & Périmètre</th>
                      <th className="p-3.5 text-center">Format</th>
                      <th className="p-3.5">Date de Génération</th>
                      <th className="p-3.5 text-right">Taille</th>
                      <th className="p-3.5 text-center">Statut</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedHistory.map((report) => {
                      const isDownloading = downloadingId === report.id;
                      const isDeleting = deletingId === report.id;

                      return (
                        <tr
                          key={report.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/60"
                        >
                          <td className="p-3.5">
                            <div className="font-black text-slate-900 dark:text-white">
                              {report.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {report.fileName}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                              {report.reportType}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            {getFormatBadge(report.format)}
                          </td>

                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {report.generatedAtLocal ?? formatReportDate(report.createdAt)}
                          </td>

                          <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatFileSize(report.fileSizeBytes)}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={13} />
                              <span>Disponible</span>
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => downloadHistoryReport(report)}
                                disabled={isDownloading}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 transition"
                                title="Télécharger le fichier"
                              >
                                <Download size={13} className={isDownloading ? 'animate-bounce' : ''} />
                                <span>{isDownloading ? '...' : 'Télécharger'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteHistoryReport(report.id)}
                                disabled={isDeleting}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition"
                                title="Supprimer de l’historique"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500">
                Aucun rapport ne correspond à vos filtres.
              </div>
            )}

            {/* Pagination */}
            {totalHistoryPages > 1 && (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
                <div>
                  Affichage de{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {(historyPage - 1) * historyPageSize + 1}
                  </strong>{' '}
                  à{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {Math.min(historyPage * historyPageSize, filteredHistory.length)}
                  </strong>{' '}
                  sur <strong className="text-slate-900 dark:text-white">{filteredHistory.length}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryPage(1)}
                    disabled={historyPage === 1}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                    Page {historyPage} / {totalHistoryPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={historyPage === totalHistoryPages}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryPage(totalHistoryPages)}
                    disabled={historyPage === totalHistoryPages}
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: CATALOGUE DES RAPPORTS                                           */}
      {/* ======================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={`${report.title}-${report.format}`}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-purple-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
                        <Icon size={22} />
                      </div>
                      {getFormatBadge(report.format)}
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {report.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {report.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await report.action();
                      await loadHistory();
                    }}
                    className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                  >
                    <Download size={15} />
                    <span>Télécharger l’export</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL : ASSISTANT DE GÉNÉRATION SUR-MESURE                              */}
      {/* ======================================================================= */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">
                  Assistant de Génération de Rapport Décisionnel
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Configurez le périmètre, les aléas et les indicateurs à compiler.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            {/* Stepper */}
            <div className="mb-6 grid grid-cols-5 gap-2">
              {[
                { s: 1, label: 'Type' },
                { s: 2, label: 'Période' },
                { s: 3, label: 'Aléas' },
                { s: 4, label: 'Zone' },
                { s: 5, label: 'Éléments' },
              ].map((item) => (
                <button
                  key={item.s}
                  type="button"
                  onClick={() => setStep(item.s as WizardStep)}
                  className={[
                    'rounded-xl py-2 text-xs font-black transition',
                    step === item.s
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                  ].join(' ')}
                >
                  {item.s}. {item.label}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-slate-400">
                  Étape 1 — Choisissez le type de rapport
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    ['national', 'Rapport national officiel multi-risques'],
                    ['region', 'Rapport régional (22 Régions)'],
                    ['district', 'Rapport par district (110 Districts)'],
                    ['commune', 'Rapport communal de vulnérabilité (1 433 Communes)'],
                    ['custom', 'Rapport sur-mesure d’urgence'],
                  ].map(([id, label]) => (
                    <ChoiceButton
                      key={id}
                      active={reportType === id}
                      label={label}
                      onClick={() => setReportType(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-slate-400">
                  Étape 2 — Fenêtre temporelle
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    ['today', "Aujourd'hui (Données temps réel)"],
                    ['7d', '7 derniers jours (Hebdomadaire)'],
                    ['30d', '30 derniers jours (Mensuel)'],
                    ['custom', 'Période personnalisée multi-annuelle'],
                  ].map(([id, label]) => (
                    <ChoiceButton
                      key={id}
                      active={period === id}
                      label={label}
                      onClick={() => setPeriod(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-slate-400">
                  Étape 3 — Modèles d'aléas à inclure
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {riskOptions.map((risk) => (
                    <button
                      key={risk.id}
                      type="button"
                      onClick={() => toggleRisk(risk.id)}
                      className={[
                        'flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-xs font-bold transition',
                        selectedRisks.includes(risk.id)
                          ? 'border-purple-400 bg-purple-50 text-purple-900 dark:border-purple-600 dark:bg-purple-950/50 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        <span>{risk.icon}</span>
                        <span>{risk.label}</span>
                      </span>
                      <span>{selectedRisks.includes(risk.id) ? '☑' : '☐'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-slate-400">
                  Étape 4 — Granularité administrative
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    ['madagascar', 'National (Madagascar complet)'],
                    ['region', 'Niveau Régional (22 entités)'],
                    ['district', 'Niveau District (110 entités)'],
                    ['commune', 'Niveau Communal (1 433 entités)'],
                  ].map(([id, label]) => (
                    <ChoiceButton
                      key={id}
                      active={zoneLevel === id}
                      label={label}
                      onClick={() => setZoneLevel(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-slate-400">
                  Étape 5 — Sections et composants décisionnels
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {elementOptions.map((element) => (
                    <button
                      key={element}
                      type="button"
                      onClick={() => toggleElement(element)}
                      className={[
                        'flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition',
                        selectedElements.includes(element)
                          ? 'border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-600 dark:bg-purple-950/50 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300',
                      ].join(' ')}
                    >
                      <span>{element}</span>
                      <span>{selectedElements.includes(element) ? '☑' : '☐'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stepper Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStep((cur) => Math.max(1, cur - 1) as WizardStep)}
                disabled={step === 1}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Précédent
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((cur) => Math.min(5, cur + 1) as WizardStep)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-700 transition"
                >
                  <span>Suivant</span>
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={generateWizardReport}
                  disabled={loadingWizard}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-purple-700 disabled:opacity-60 transition"
                >
                  <Download size={15} />
                  <span>{loadingWizard ? 'Génération du rapport...' : 'Générer & Télécharger le rapport'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
