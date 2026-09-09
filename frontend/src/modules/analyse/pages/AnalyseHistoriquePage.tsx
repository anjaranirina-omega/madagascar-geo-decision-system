import React, { useEffect, useState } from 'react';
import { History, Calendar, TrendingUp, Filter, RefreshCw, BarChart2, AlertCircle } from 'lucide-react';
import PageHeader from '../../../shared/components/ui/PageHeader';
import { solapService, SolapTimeSeriesRecord } from '../services/solap.service';

export default function AnalyseHistoriquePage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyse Historique & Évolution Temporelle"
        subtitle="Rétrospective multi-annuelle des événements climatiques majeurs et tendances d’exposition à Madagascar."
        icon={<History size={32} />}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Type d'aléa :
            </span>
            <select
              value={riskType}
              onChange={(e) => setRiskType(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="CYCLONE">Cyclones Tropicaux (IBTrACS)</option>
              <option value="FLOOD">Inondations & Crues</option>
              <option value="DROUGHT">Sécheresses & Déficit hydrique</option>
              <option value="GLOBAL">Indice Global Composite</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-500">
            {data.length} période(s) temporelle(s) consolidée(s)
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
          Évolution chronologique des scores de risque
        </h3>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin text-purple-600" size={24} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-sm font-medium text-slate-500">
            Aucune donnée historique trouvée pour cet aléa dans le Data Warehouse.
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, idx) => {
              const pct = Number(item.riskMean || 0).toFixed(1);
              const maxPct = Number(item.riskMax || 0).toFixed(1);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-900 dark:text-white">
                      {item.date ? new Date(item.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : `Année ${item.year} - Mois ${item.month}`}
                    </span>
                    <span className="text-purple-600 dark:text-purple-400">
                      Moyenne: {pct}% | Max: {maxPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${Math.min(Number(pct), 100)}%` }}
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
