import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Compass,
  Table,
  LayoutGrid,
  ShieldAlert,
  Sliders,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import AnalyseNavTabs from '../components/AnalyseNavTabs';
import { solapService, SolapCubeRecord, SolapSummaryRecord } from '../services/solap.service';

const RISK_TYPES = [
  { value: '', label: 'Tous les aléas' },
  { value: 'GLOBAL', label: 'Risque Global Composite' },
  { value: 'FLOOD', label: 'Inondation' },
  { value: 'CYCLONE', label: 'Cyclone Tropical' },
  { value: 'DROUGHT', label: 'Sécheresse' },
  { value: 'LANDSLIDE', label: 'Glissement de terrain' },
];

const ZONE_TYPES = [
  { value: '', label: 'Tous les niveaux' },
  { value: 'region', label: 'Régions (22)' },
  { value: 'district', label: 'Districts (119)' },
  { value: 'commune', label: 'Communes (1 579)' },
];

const RISK_CONFIG: Record<
  string,
  { label: string; icon: string; border: string; bg: string; text: string; badge: string }
> = {
  CYCLONE: {
    label: 'Cyclone Tropical',
    icon: '🌀',
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-purple-50/70 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  },
  DROUGHT: {
    label: 'Sécheresse',
    icon: '☀️',
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  FLOOD: {
    label: 'Inondation',
    icon: '🌊',
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
  GLOBAL: {
    label: 'Risque Global Composite',
    icon: '🌐',
    border: 'border-indigo-200 dark:border-indigo-800',
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  },
  LANDSLIDE: {
    label: 'Glissement de terrain',
    icon: '🏔️',
    border: 'border-emerald-200 dark:border-emerald-800',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
};

interface PivotedZone {
  zoneId: string;
  zoneNom: string;
  zoneCode?: string;
  zoneType: string;
  populationExposed: number;
  areaKm2: number;
  risks: {
    GLOBAL?: { mean: number; max: number };
    FLOOD?: { mean: number; max: number };
    DROUGHT?: { mean: number; max: number };
    CYCLONE?: { mean: number; max: number };
    LANDSLIDE?: { mean: number; max: number };
    [key: string]: { mean: number; max: number } | undefined;
  };
  dominantRisk: {
    type: string;
    score: number;
  };
  overallMax: number;
}

export default function SolapExplorerPage() {
  const navigate = useNavigate();
  const [riskType, setRiskType] = useState<string>('');
  const [zoneType, setZoneType] = useState<string>('region');
  const [year, setYear] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'pivot' | 'detailed'>('pivot');

  const [records, setRecords] = useState<SolapCubeRecord[]>([]);
  const [summaries, setSummaries] = useState<SolapSummaryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [pivotSortField, setPivotSortField] = useState<string>('overallMax');
  const [pivotSortAsc, setPivotSortAsc] = useState<boolean>(false);
  const [sortField, setSortField] = useState<keyof SolapCubeRecord>('riskMax');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cubeData, summaryData] = await Promise.all([
        solapService.getRiskCube({
          riskType: riskType || undefined,
          zoneType: zoneType || undefined,
          year: year ? Number(year) : undefined,
          limit: 1000,
        }),
        solapService.getRiskSummary({
          riskType: riskType || undefined,
          zoneType: zoneType || undefined,
          year: year ? Number(year) : undefined,
        }),
      ]);
      setRecords(cubeData || []);
      setSummaries(summaryData || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Erreur chargement SOLAP:', err);
      setError('Impossible de charger les données du cube SOLAP / DWH.');
    } finally {
      setLoading(false);
    }
  }, [riskType, zoneType, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform records into Pivoted Zones (1 row per zone with all hazard columns)
  const pivotedZones = useMemo(() => {
    const map = new Map<string, PivotedZone>();

    for (const r of records) {
      const key = r.zoneId || r.zoneNom;
      let existing = map.get(key);
      if (!existing) {
        existing = {
          zoneId: r.zoneId,
          zoneNom: r.zoneNom,
          zoneCode: r.zoneCode,
          zoneType: r.zoneType,
          populationExposed: Number(r.populationExposed) || 0,
          areaKm2: Number(r.areaKm2) || 0,
          risks: {},
          dominantRisk: { type: 'GLOBAL', score: 0 },
          overallMax: 0,
        };
        map.set(key, existing);
      }

      const meanVal = Number(r.riskMean) || 0;
      const maxVal = Number(r.riskMax) || 0;
      existing.risks[r.riskType] = { mean: meanVal, max: maxVal };

      if (maxVal > existing.overallMax) {
        existing.overallMax = maxVal;
        existing.dominantRisk = { type: r.riskType, score: maxVal };
      }
      if (Number(r.populationExposed) > existing.populationExposed) {
        existing.populationExposed = Number(r.populationExposed);
      }
      if (Number(r.areaKm2) > existing.areaKm2) {
        existing.areaKm2 = Number(r.areaKm2);
      }
    }

    return Array.from(map.values());
  }, [records]);

  // Filter & Sort Pivoted Zones
  const filteredPivotedZones = useMemo(() => {
    let list = pivotedZones;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (z) =>
          z.zoneNom?.toLowerCase().includes(q) ||
          z.zoneCode?.toLowerCase().includes(q) ||
          z.zoneType?.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (pivotSortField === 'zoneNom') {
        valA = a.zoneNom || '';
        valB = b.zoneNom || '';
        return pivotSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (pivotSortField === 'populationExposed') {
        valA = a.populationExposed;
        valB = b.populationExposed;
      } else if (pivotSortField === 'areaKm2') {
        valA = a.areaKm2;
        valB = b.areaKm2;
      } else if (pivotSortField === 'overallMax') {
        valA = a.overallMax;
        valB = b.overallMax;
      } else if (pivotSortField.startsWith('risk_')) {
        const type = pivotSortField.replace('risk_', '');
        valA = a.risks[type]?.max ?? -1;
        valB = b.risks[type]?.max ?? -1;
      }

      return pivotSortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [pivotedZones, searchTerm, pivotSortField, pivotSortAsc]);

  // Filter & Sort Detailed Flat Records
  const filteredDetailedRecords = useMemo(() => {
    let list = records;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.zoneNom?.toLowerCase().includes(q) ||
          r.zoneCode?.toLowerCase().includes(q) ||
          r.riskType?.toLowerCase().includes(q) ||
          r.riskLabel?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [records, searchTerm, sortField, sortAsc]);

  // Pagination for Active View
  const totalItems = viewMode === 'pivot' ? filteredPivotedZones.length : filteredDetailedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedPivoted = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPivotedZones.slice(start, start + pageSize);
  }, [filteredPivotedZones, currentPage, pageSize]);

  const paginatedDetailed = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDetailedRecords.slice(start, start + pageSize);
  }, [filteredDetailedRecords, currentPage, pageSize]);

  const stats = useMemo(() => {
    if (!records.length) {
      return { totalPop: 0, avgRisk: 0, maxRisk: 0, count: 0, uniqueZones: 0 };
    }
    const uniqueZones = new Set(records.map((r) => r.zoneId || r.zoneNom)).size;
    const totalPop = pivotedZones.reduce((acc, r) => acc + (Number(r.populationExposed) || 0), 0);
    const avgRisk =
      records.reduce((acc, r) => acc + (Number(r.riskMean) || 0), 0) / records.length;
    const maxRisk = Math.max(...records.map((r) => Number(r.riskMax) || 0));
    return {
      totalPop,
      avgRisk: Number(avgRisk.toFixed(2)),
      maxRisk: Number(maxRisk.toFixed(2)),
      count: records.length,
      uniqueZones,
    };
  }, [records, pivotedZones]);

  const togglePivotSort = (field: string) => {
    if (pivotSortField === field) {
      setPivotSortAsc(!pivotSortAsc);
    } else {
      setPivotSortField(field);
      setPivotSortAsc(false);
    }
  };

  const toggleSort = (field: keyof SolapCubeRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const exportCsv = () => {
    if (!records.length) return;
    if (viewMode === 'pivot') {
      const headers = [
        'Code Zone',
        'Nom Zone',
        'Niveau',
        'Score Global',
        'Score Inondation',
        'Score Sécheresse',
        'Score Cyclone',
        'Score Glissement',
        'Pop. Exposée',
        'Surface (km²)',
      ];
      const rows = filteredPivotedZones.map((z) => [
        z.zoneCode || '',
        `"${z.zoneNom}"`,
        z.zoneType,
        z.risks['GLOBAL']?.max?.toFixed(2) ?? '',
        z.risks['FLOOD']?.max?.toFixed(2) ?? '',
        z.risks['DROUGHT']?.max?.toFixed(2) ?? '',
        z.risks['CYCLONE']?.max?.toFixed(2) ?? '',
        z.risks['LANDSLIDE']?.max?.toFixed(2) ?? '',
        z.populationExposed ?? '',
        z.areaKm2?.toFixed(1) ?? '',
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `solap_matrice_export_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Type Risque',
        'Niveau',
        'Code Zone',
        'Nom Zone',
        'Risque Moyen',
        'Risque Max',
        'Population Exposée',
        'Surface (km²)',
      ];
      const rows = filteredDetailedRecords.map((r) => [
        r.riskType,
        r.zoneType,
        r.zoneCode,
        `"${r.zoneNom}"`,
        r.riskMean?.toFixed(2) ?? '',
        r.riskMax?.toFixed(2) ?? '',
        r.populationExposed ?? '',
        r.areaKm2?.toFixed(1) ?? '',
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `solap_cube_export_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderScoreCell = (score?: number | null) => {
    if (score === null || score === undefined || Number.isNaN(Number(score))) {
      return <span className="text-slate-300 dark:text-slate-700">—</span>;
    }
    const val = Number(score);
    const bgClass =
      val >= 75
        ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 font-black'
        : val >= 55
          ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900 font-bold'
          : val >= 35
            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900 font-medium'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900 font-medium';

    return (
      <span
        className={`inline-flex items-center justify-center min-w-[50px] px-2 py-0.5 text-xs rounded-lg border ${bgClass}`}
      >
        {val.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AnalyseNavTabs />

      <PageHeader
        title="Explorateur SOLAP & Data Warehouse"
        subtitle="Analyses multidimensionnelles OLAP, forage spatial (Drill-Down / Roll-Up) et croisements territoriaux."
        icon={<Layers size={32} className="text-purple-600" />}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCsv}
              disabled={!records.length}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download size={15} />
              <span>Exporter CSV</span>
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Actualiser</span>
            </button>
          </div>
        }
      />

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Zones Administratives
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
              <MapPin size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.uniqueZones.toLocaleString('fr-FR')}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Niveau actif : {zoneType === 'region' ? '22 Régions' : zoneType === 'district' ? '119 Districts' : zoneType === 'commune' ? '1 579 Communes' : 'Tous niveaux'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Risque maximal absolu
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.maxRisk} / 100
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pic d'exposition modélisé
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Indice moyen national
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.avgRisk} / 100
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Moyenne territoriale du cube
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Population cumulée exposée
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {stats.totalPop.toLocaleString('fr-FR')} hab.
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Source WorldPop & DWH
          </p>
        </div>
      </div>

      {/* Barre de filtres et Forage OLAP */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
              <Filter size={14} />
              <span>Dimensions :</span>
            </div>

            {/* Aléa */}
            <select
              value={riskType}
              onChange={(e) => setRiskType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {RISK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Échelle spatiale (Roll-up / Drill-down) */}
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {ZONE_TYPES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>

            {/* Recherche textuelle */}
            <div className="relative min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Filtrer par nom ou code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Commutateur de Mode d'Affichage (Matrice synthétique vs Cellules détaillées) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Vue :</span>
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('pivot')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                  viewMode === 'pivot'
                    ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-900 dark:text-purple-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <LayoutGrid size={13} />
                <span>Matrice par Zone ({filteredPivotedZones.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                  viewMode === 'detailed'
                    ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-900 dark:text-purple-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Table size={13} />
                <span>Cellules ({filteredDetailedRecords.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé synthétique par Aléa (Grille propre 5 colonnes) */}
      {summaries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Database size={15} className="text-purple-600" />
              Agrégations synthétiques du Data Warehouse (dwh.fact_risk_indicator)
            </h4>
            <span className="text-xs font-bold text-slate-400">
              {summaries.length} profils d'aléas consolidés
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {summaries.map((s, idx) => {
              const cfg = RISK_CONFIG[s.riskType] || {
                label: s.riskLabel || s.riskType,
                icon: '📍',
                border: 'border-slate-200 dark:border-slate-800',
                bg: 'bg-slate-50/70 dark:bg-slate-950/30',
                text: 'text-slate-700 dark:text-slate-300',
                badge: 'bg-slate-100 text-slate-800',
              };

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 transition hover:shadow-xs ${cfg.border} ${cfg.bg}`}
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className={`flex items-center gap-1.5 truncate ${cfg.text}`}>
                      <span>{cfg.icon}</span>
                      <span className="truncate">{cfg.label}</span>
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-white/80 dark:bg-slate-900 text-slate-500 shrink-0">
                      {s.zoneType}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Moyenne :</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {Number(s.riskMean || 0).toFixed(1)} / 100
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Max :</span>
                    <span className="font-black text-rose-600 dark:text-rose-400">
                      {Number(s.riskMax || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Zones :</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {s.zoneCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tableau Réorganisé : Vue Pivot Synthétique OU Vue Détaillée */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* En-tête de section avec compte et pagination info */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                {viewMode === 'pivot'
                  ? `Synthèse Matricielle des Territoires (${filteredPivotedZones.length} zones)`
                  : `Cellules Multidimensionnelles (${filteredDetailedRecords.length} lignes)`}
              </span>
              <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                1 ligne par {viewMode === 'pivot' ? 'zone' : 'aléa/zone'}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {viewMode === 'pivot'
                ? 'Scores maximaux par type de risque alignés par territoire pour une comparaison rapide.'
                : 'Enregistrements élémentaires du cube de données spatiales.'}
            </p>
          </div>

          {/* Sélecteur de nombre d'éléments par page */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Afficher :</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value={10}>10 par page</option>
              <option value={15}>15 par page</option>
              <option value={25}>25 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm font-bold text-rose-500">{error}</div>
        ) : totalItems === 0 && !loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Aucun enregistrement ne correspond aux filtres sélectionnés.
          </div>
        ) : viewMode === 'pivot' ? (
          /* ======================================================== */
          /* MODE PIVOT (1 ligne propre par zone)                     */
          /* ======================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-black text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th
                    className="cursor-pointer p-3.5 hover:text-purple-600"
                    onClick={() => togglePivotSort('zoneNom')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Zone Administrative</span>
                      {pivotSortField === 'zoneNom' ? (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </div>
                  </th>
                  <th className="p-3.5 text-center">Niveau</th>
                  <th
                    className="cursor-pointer p-3.5 text-center hover:text-purple-600"
                    onClick={() => togglePivotSort('risk_GLOBAL')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>🌐 Global</span>
                      {pivotSortField === 'risk_GLOBAL' && (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-center hover:text-purple-600"
                    onClick={() => togglePivotSort('risk_FLOOD')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>🌊 Inondation</span>
                      {pivotSortField === 'risk_FLOOD' && (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-center hover:text-purple-600"
                    onClick={() => togglePivotSort('risk_DROUGHT')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>☀️ Sécheresse</span>
                      {pivotSortField === 'risk_DROUGHT' && (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-center hover:text-purple-600"
                    onClick={() => togglePivotSort('risk_CYCLONE')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>🌀 Cyclone</span>
                      {pivotSortField === 'risk_CYCLONE' && (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-center hover:text-purple-600"
                    onClick={() => togglePivotSort('risk_LANDSLIDE')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>🏔️ Glissement</span>
                      {pivotSortField === 'risk_LANDSLIDE' && (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-right hover:text-purple-600"
                    onClick={() => togglePivotSort('populationExposed')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Pop. Exposée</span>
                      {pivotSortField === 'populationExposed' ? (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-right hover:text-purple-600"
                    onClick={() => togglePivotSort('areaKm2')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Superficie</span>
                      {pivotSortField === 'areaKm2' ? (
                        pivotSortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </div>
                  </th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedPivoted.map((z, idx) => {
                  return (
                    <tr
                      key={`${z.zoneId}-${idx}`}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/60"
                    >
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{z.zoneNom || '—'}</span>
                          {z.zoneCode && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({z.zoneCode})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {z.zoneType}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {renderScoreCell(z.risks['GLOBAL']?.max)}
                      </td>
                      <td className="p-3.5 text-center">
                        {renderScoreCell(z.risks['FLOOD']?.max)}
                      </td>
                      <td className="p-3.5 text-center">
                        {renderScoreCell(z.risks['DROUGHT']?.max)}
                      </td>
                      <td className="p-3.5 text-center">
                        {renderScoreCell(z.risks['CYCLONE']?.max)}
                      </td>
                      <td className="p-3.5 text-center">
                        {renderScoreCell(z.risks['LANDSLIDE']?.max)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {z.populationExposed > 0 ? z.populationExposed.toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="p-3.5 text-right text-slate-500">
                        {z.areaKm2 > 0 ? `${z.areaKm2.toFixed(1)} km²` : '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => navigate('/carte')}
                          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 inline-flex items-center gap-1 font-bold"
                          title="Localiser sur la carte interactive"
                        >
                          <span>Carte</span>
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ======================================================== */
          /* MODE DÉTAILLÉ (Cellules Individuelles OLAP)              */
          /* ======================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-black text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th
                    className="cursor-pointer p-3.5 hover:text-purple-600"
                    onClick={() => toggleSort('zoneNom')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Zone Administrative</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 hover:text-purple-600"
                    onClick={() => toggleSort('zoneType')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Niveau</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 hover:text-purple-600"
                    onClick={() => toggleSort('riskType')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Aléa</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-right hover:text-purple-600"
                    onClick={() => toggleSort('riskMean')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Risque Moyen</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-right hover:text-purple-600"
                    onClick={() => toggleSort('riskMax')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Risque Max</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-right hover:text-purple-600"
                    onClick={() => toggleSort('populationExposed')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Pop. Exposée</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-3.5 text-right hover:text-purple-600"
                    onClick={() => toggleSort('areaKm2')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Superficie</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedDetailed.map((r, i) => {
                  const maxVal = Number(r.riskMax) || 0;
                  const meanVal = Number(r.riskMean) || 0;
                  const pop = Number(r.populationExposed) || 0;
                  const area = Number(r.areaKm2) || 0;

                  return (
                    <tr
                      key={`${r.zoneId}-${r.riskType}-${i}`}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-950/60"
                    >
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{r.zoneNom || '—'}</span>
                          {r.zoneCode && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({r.zoneCode})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 uppercase tracking-wider text-[11px] font-bold text-slate-500">
                        {r.zoneType}
                      </td>
                      <td className="p-3.5 font-bold text-purple-700 dark:text-purple-300">
                        {r.riskLabel || r.riskType}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-800 dark:text-slate-200">
                        {meanVal.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right">
                        {renderScoreCell(maxVal)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {pop > 0 ? pop.toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="p-3.5 text-right text-slate-500">
                        {area > 0 ? `${area.toFixed(1)} km²` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Barre de Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
            <div>
              Affichage de{' '}
              <strong className="text-slate-900 dark:text-white">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              à{' '}
              <strong className="text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              sur <strong className="text-slate-900 dark:text-white">{totalItems}</strong> éléments
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Première page"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Page précédente"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200">
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Page suivante"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title="Dernière page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
