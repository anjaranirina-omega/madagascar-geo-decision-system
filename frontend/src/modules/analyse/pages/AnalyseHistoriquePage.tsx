import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  Calendar,
  TrendingUp,
  Filter,
  RefreshCw,
  BarChart2,
  AlertCircle,
  Users,
  Layers,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import AnalyseNavTabs from '../components/AnalyseNavTabs';
import { solapService, SolapTimeSeriesRecord } from '../services/solap.service';

const HAZARDS = [
  { value: 'CYCLONE', label: 'Cyclones Tropicaux (IBTrACS)', icon: '🌀' },
  { value: 'FLOOD', label: 'Inondations & Crues (CHIRPS)', icon: '🌊' },
  { value: 'DROUGHT', label: 'Sécheresses & Stress hydrique (NDVI)', icon: '☀️' },
  { value: 'LANDSLIDE', label: 'Glissements de terrain (Pente/Pluie)', icon: '🏔️' },
  { value: 'GLOBAL', label: 'Indice Global Composite', icon: '🌐' },
];

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: digits,
  });
}

export default function AnalyseHistoriquePage() {
  const navigate = useNavigate();
  const [riskType, setRiskType] = useState<string>('CYCLONE');
  const [data, setData] = useState<SolapTimeSeriesRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    solapService
      .getRiskTimeSeries({ riskType })
      .then((res) => {
        if (active) {
          setData(res || []);
        }
      })
      .catch((err) => {
        console.error('Erreur chargement série temporelle:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [riskType]);

  const stats = useMemo(() => {
    if (!data.length) {
      return { maxRisk: 0, avgRisk: 0, totalPop: 0, peakPeriod: '—' };
    }
    const maxVal = Math.max(...data.map((d) => Number(d.riskMax) || 0));
    const avgVal =
      data.reduce((sum, d) => sum + (Number(d.riskMean) || 0), 0) / data.length;
    const maxPop = Math.max(...data.map((d) => Number(d.populationExposed) || 0));
    const peakRow = data.find((d) => (Number(d.riskMax) || 0) === maxVal);
    const peakPeriod = peakRow?.date
      ? new Date(peakRow.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : peakRow
        ? `Année ${peakRow.year} - Mois ${peakRow.month}`
        : '—';

    return {
      maxRisk: Number(maxVal.toFixed(1)),
      avgRisk: Number(avgVal.toFixed(1)),
      totalPop: maxPop,
      peakPeriod,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Analyse Historique & Évolution Chronologique"
        subtitle="Rétrospective pluriannuelle des événements climatiques majeurs et tendances d’exposition à Madagascar (DWH / SOLAP)."
        icon={<History size={32} className="text-purple-600" />}
      />

      {/* Module Navigation Tabs */}
      <AnalyseNavTabs />

      {/* 4 KPIs Historiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Pic Historique
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.maxRisk} / 100
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Score maximal d'aléa enregistré
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Période Critique
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-2 truncate text-lg font-black text-slate-900 dark:text-white capitalize">
            {stats.peakPeriod}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mois du pic historique d'exposition
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Moyenne Pluriannuelle
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
              <BarChart2 size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.avgRisk} / 100
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Niveau moyen sur la série temporelle
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Pop. Max Exposée
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.totalPop > 0 ? `${stats.totalPop.toLocaleString('fr-FR')} hab.` : '—'}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Impact humain maximal enregistré
          </p>
        </div>
      </div>

      {/* Hazard Selector Pills */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-2">
              Modèle d'aléa :
            </span>
            {HAZARDS.map((h) => (
              <button
                key={h.value}
                type="button"
                onClick={() => setRiskType(h.value)}
                className={[
                  'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition',
                  riskType === h.value
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                <span>{h.icon}</span>
                <span>{h.label}</span>
              </button>
            ))}
          </div>

          <div className="text-xs font-bold text-slate-500">
            {data.length} période(s) dans le cube DWH
          </div>
        </div>
      </div>

      {/* Chronological Timeline & Progress Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Chronologie des Événements & Intensités Modélisées
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Évolution mensuelle des indices de risque consolidés dans la table de faits dwh.fact_risk_indicator.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/analyse/solap')}
            className="inline-flex items-center gap-1 text-xs font-black text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            <span>Explorer dans le cube SOLAP</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="animate-spin text-purple-600 mb-2" size={24} />
            <span className="text-xs font-bold">Extraction des séries temporelles...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-xs font-medium text-slate-500">
            Aucun enregistrement temporel archivé pour cet aléa dans le Data Warehouse.
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, idx) => {
              const meanVal = Number(item.riskMean || 0);
              const maxVal = Number(item.riskMax || 0);
              const pop = Number(item.populationExposed || 0);
              const isPeak = maxVal === stats.maxRisk;

              return (
                <div
                  key={idx}
                  className={[
                    'rounded-2xl border p-4 transition-all hover:shadow-xs',
                    isPeak
                      ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20'
                      : 'border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40',
                  ].join(' ')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {item.date
                          ? new Date(item.date).toLocaleDateString('fr-FR', {
                              month: 'long',
                              year: 'numeric',
                            })
                          : `Année ${item.year} - Mois ${item.month}`}
                      </span>
                      {isPeak && (
                        <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs">
                          🔥 Pic Historique
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Moyenne : <strong className="text-slate-900 dark:text-white">{meanVal.toFixed(1)} / 100</strong>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Score Max :{' '}
                        <strong className={maxVal >= 75 ? 'text-rose-600 font-black' : 'text-purple-600 font-bold'}>
                          {maxVal.toFixed(1)} / 100
                        </strong>
                      </span>
                      {pop > 0 && (
                        <span className="text-slate-500 dark:text-slate-400">
                          Pop : <strong className="text-blue-600">{pop.toLocaleString('fr-FR')} hab.</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-800">
                    <div
                      className={[
                        'h-full rounded-full transition-all duration-500',
                        maxVal >= 75
                          ? 'bg-gradient-to-r from-orange-500 to-rose-600'
                          : maxVal >= 50
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-500',
                      ].join(' ')}
                      style={{ width: `${Math.min(maxVal, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
