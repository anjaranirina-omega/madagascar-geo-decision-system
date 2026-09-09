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
  Database,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';
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
  { value: 'region', label: 'Régions (23)' },
  { value: 'district', label: 'Districts (119)' },
  { value: 'commune', label: 'Communes (1579+)' },
];

export default function SolapExplorerPage() {
  const [riskType, setRiskType] = useState<string>('');
  const [zoneType, setZoneType] = useState<string>('region');
  const [year, setYear] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [records, setRecords] = useState<SolapCubeRecord[]>([]);
  const [summaries, setSummaries] = useState<SolapSummaryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof SolapCubeRecord>('riskMax');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cubeData, summaryData] = await Promise.all([
        solapService.getRiskCube({
          riskType: riskType || undefined,
          zoneType: zoneType || undefined,
          year: year ? Number(year) : undefined,
          limit: 200,
        }),
        solapService.getRiskSummary({
          riskType: riskType || undefined,
          zoneType: zoneType || undefined,
          year: year ? Number(year) : undefined,
        }),
      ]);
      setRecords(cubeData || []);
      setSummaries(summaryData || []);
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

  const filteredRecords = useMemo(() => {
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

  const stats = useMemo(() => {
    if (!records.length) {
      return { totalPop: 0, avgRisk: 0, maxRisk: 0, count: 0 };
    }
    const totalPop = records.reduce((acc, r) => acc + (Number(r.populationExposed) || 0), 0);
    const avgRisk =
      records.reduce((acc, r) => acc + (Number(r.riskMean) || 0), 0) / records.length;
    const maxRisk = Math.max(...records.map((r) => Number(r.riskMax) || 0));
    return {
      totalPop,
      avgRisk: Number(avgRisk.toFixed(2)),
      maxRisk: Number(maxRisk.toFixed(2)),
      count: records.length,
    };
  }, [records]);

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
    const headers = ['Type Risque', 'Niveau', 'Code Zone', 'Nom Zone', 'Risque Moyen', 'Risque Max', 'Population Exposée', 'Surface (km²)'];
    const rows = filteredRecords.map((r) => [
      r.riskType,
      r.zoneType,
      r.zoneCode,
      `"${r.zoneNom}"`,
      r.riskMean?.toFixed(2) ?? '',
      r.riskMax?.toFixed(2) ?? '',
      r.populationExposed ?? '',
      r.areaKm2?.toFixed(1) ?? '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `solap_cube_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explorateur SOLAP & Data Warehouse"
        subtitle="Analyses multidimensionnelles OLAP, forage spatial (Drill-Down / Roll-Up) et croisements territoriaux."
        icon={<Layers size={32} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={!records.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download size={15} />
              Exporter CSV
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        }
      />

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Zones analysées
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
              <MapPin size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.count.toLocaleString('fr-FR')}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Échelle active : {zoneType || 'Toutes échelles'}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Risque maximal
            </span>
            <div className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-950/50 dark:text-red-300">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-600 dark:text-red-400">
            {stats.maxRisk} / 100
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pic d'exposition modélisé
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Indice moyen pondéré
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

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
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
            Source WorldPop & Croisements DWH
          </p>
        </div>
      </div>

      {/* Barre de filtres OLAP */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-purple-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Dimensions :
              </span>
            </div>

            {/* Aléa */}
            <select
              value={riskType}
              onChange={(e) => setRiskType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {RISK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Échelle spatiale */}
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {ZONE_TYPES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>

            {/* Année */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">Toutes années</option>
              <option value="2026">2026 (En cours)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          {/* Recherche */}
          <div className="relative w-full md:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Filtrer par nom ou code zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Résumé par type d'aléa */}
      {summaries.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Database size={17} className="text-purple-600" />
              Agrégations synthétiques du Data Warehouse (dwh.fact_risk_indicator)
            </h4>
            <span className="text-xs font-bold text-slate-400">
              {summaries.length} profil(s) agrégé(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaries.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-purple-700 dark:text-purple-300">
                    {s.riskLabel || s.riskType}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-slate-500 shadow-2xs dark:bg-slate-900">
                    {s.zoneType}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Moyenne :</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {Number(s.riskMean || 0).toFixed(2)} / 100
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Max :</span>
                  <span className="text-sm font-black text-red-600 dark:text-red-400">
                    {Number(s.riskMax || 0).toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Zones couvertes :</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {s.zoneCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau détaillé du Cube OLAP */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              Cellules multidimensionnelles ({filteredRecords.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cliquez sur les en-têtes pour trier les dimensions et métriques.
            </p>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm font-bold text-red-500">{error}</div>
        ) : filteredRecords.length === 0 && !loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Aucun enregistrement ne correspond aux dimensions sélectionnées.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-black text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th
                    className="cursor-pointer p-4 hover:text-purple-600"
                    onClick={() => toggleSort('zoneNom')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Zone Administrative</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-4 hover:text-purple-600"
                    onClick={() => toggleSort('zoneType')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Niveau</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-4 hover:text-purple-600"
                    onClick={() => toggleSort('riskType')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Aléa</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-4 text-right hover:text-purple-600"
                    onClick={() => toggleSort('riskMean')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Risque Moyen</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-4 text-right hover:text-purple-600"
                    onClick={() => toggleSort('riskMax')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Risque Max</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-4 text-right hover:text-purple-600"
                    onClick={() => toggleSort('populationExposed')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Pop. Exposée</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer p-4 text-right hover:text-purple-600"
                    onClick={() => toggleSort('areaKm2')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Superficie</span>
                      <ArrowUpDown size={13} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredRecords.map((r, i) => {
                  const maxVal = Number(r.riskMax) || 0;
                  const meanVal = Number(r.riskMean) || 0;
                  const pop = Number(r.populationExposed) || 0;
                  const area = Number(r.areaKm2) || 0;

                  return (
                    <tr
                      key={`${r.zoneId}-${r.riskType}-${i}`}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-950/50"
                    >
                      <td className="p-4 font-black text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{r.zoneNom || '—'}</span>
                          {r.zoneCode && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({r.zoneCode})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 uppercase tracking-wider text-[11px] font-bold text-slate-500">
                        {r.zoneType}
                      </td>
                      <td className="p-4 font-bold text-purple-700 dark:text-purple-300">
                        {r.riskLabel || r.riskType}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200">
                        {meanVal.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={[
                            'inline-block rounded-lg px-2.5 py-1 text-xs font-black',
                            maxVal >= 70
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : maxVal >= 45
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
                          ].join(' ')}
                        >
                          {maxVal.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-300">
                        {pop > 0 ? pop.toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="p-4 text-right text-slate-500">
                        {area > 0 ? `${area.toFixed(1)} km²` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
