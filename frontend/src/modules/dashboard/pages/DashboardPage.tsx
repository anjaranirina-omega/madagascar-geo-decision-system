import {
  AlertTriangle,
  Bell,
  CloudRain,
  Droplets,
  Thermometer,
  TrendingUp,
  UploadCloud,
  Wind,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  DashboardSummary,
  RiskDistribution,
  TopRiskZone,
  dashboardService,
} from '../services/dashboard.service';

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function riskLabel(level?: string) {
  const labels = {
    FAIBLE: 'Faible',
    MOYEN: 'Moyen',
    ELEVE: 'Élevé',
    CRITIQUE: 'Critique',
  };

  return labels[level as keyof typeof labels] ?? '—';
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

function getRiskDistributionItems(distribution: RiskDistribution | null) {
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

function riskColor(level?: string) {
  const colors = {
    FAIBLE: 'bg-green-500',
    MOYEN: 'bg-yellow-500',
    ELEVE: 'bg-orange-500',
    CRITIQUE: 'bg-red-500',
  };

  return colors[level as keyof typeof colors] ?? 'bg-slate-400';
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topZones, setTopZones] = useState<TopRiskZone[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(null);
  const [climate, setClimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [
        summaryData,
        topRiskZonesData,
        riskDistributionData,
        climateData,
      ] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTopRiskZones(),
        dashboardService.getRiskDistribution(),
        dashboardService.getClimateIndicators(),
      ]);

      setSummary(summaryData);
      setTopZones(topRiskZonesData);
      setDistribution(riskDistributionData);
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

  const riskDistributionGradient = buildRiskDistributionGradient(distribution);
  const riskDistributionItems = getRiskDistributionItems(distribution);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Chargement du tableau de bord...
      </div>
    );
  }

  const kpis = [
    {
      title: 'Risque moyen national',
      value: (summary?.riskMeanNational ?? 0).toFixed(1),
      suffix: '/100',
      subtitle: 'Moyenne des régions',
      icon: TrendingUp,
    },
    {
      title: 'Zones critiques',
      value: String(summary?.criticalZones ?? 0),
      suffix: '',
      subtitle: `${summary?.highZones ?? 0} zones élevées`,
      icon: AlertTriangle,
    },
    {
      title: 'Alertes actives',
      value: String(summary?.activeAlerts ?? 0),
      suffix: '',
      subtitle: `${summary?.criticalAlerts ?? 0} critiques`,
      icon: Bell,
    },
    {
      title: 'Dernière mise à jour',
      value: summary?.lastUpdate ? 'OK' : '—',
      suffix: '',
      subtitle: formatDate(summary?.lastUpdate),
      icon: UploadCloud,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div key={kpi.title} className="card p-6">
              <div className="mb-3 text-sm font-semibold text-slate-500">
                {kpi.title}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {kpi.value}
                  </span>
                  <span className="ml-1 text-slate-500">{kpi.suffix}</span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-riskgreen dark:bg-slate-800">
                  <Icon size={28} />
                </div>
              </div>

              <div className="mt-2 text-sm text-slate-500">
                {kpi.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="card p-6">
          <h2 className="mb-6 font-extrabold text-slate-900 dark:text-white">
            Répartition des niveaux de risque
          </h2>

          <div className="grid grid-cols-[150px_1fr] items-center gap-5">
            <div
              className="relative h-36 w-36 rounded-full"
              style={{ background: riskDistributionGradient }}
            >
              <div className="absolute inset-9 rounded-full bg-white dark:bg-slate-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {distributionTotal}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    zones
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {riskDistributionItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span>
                    <i className={`mr-2 inline-block h-3 w-3 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Total zones analysées : {distributionTotal}
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 dark:text-white">
              Tendance des risques
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">
              Historique à venir
            </span>
          </div>

          <svg viewBox="0 0 700 220" className="h-56 w-full">
            <line x1="0" y1="180" x2="700" y2="180" stroke="#e5e7eb" />
            <line x1="0" y1="130" x2="700" y2="130" stroke="#e5e7eb" />
            <line x1="0" y1="80" x2="700" y2="80" stroke="#e5e7eb" />

            <polyline
              points="0,150 90,128 180,135 270,100 360,110 450,80 560,90 700,64"
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polyline
              points="0,170 90,152 180,158 270,134 360,140 450,118 560,124 700,104"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polyline
              points="0,190 90,176 180,178 270,164 360,160 450,146 560,152 700,135"
              fill="none"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="card p-6">
          <h2 className="mb-6 font-extrabold text-slate-900 dark:text-white">
            Top 5 des régions les plus à risque
          </h2>

          <div className="space-y-5">
            {topZones.map((zone, index) => (
              <div
                key={zone.zoneId}
                className="grid grid-cols-[24px_1fr_70px] items-center gap-3"
              >
                <strong>{index + 1}</strong>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm font-medium">
                    <span>{zone.zoneNom}</span>
                    <span className="text-xs text-slate-500">
                      {riskLabel(zone.riskLevel)}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${riskColor(zone.riskLevel)}`}
                      style={{ width: `${zone.riskMax ?? 0}%` }}
                    />
                  </div>
                </div>

                <strong className="text-sm">
                  {(zone.riskMax ?? 0).toFixed(1)}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-6 font-extrabold text-slate-900 dark:text-white">
            Indicateurs climatiques
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {climate &&
              [
                [CloudRain, climate.rainfall.label, `${climate.rainfall.value} ${climate.rainfall.unit}`, climate.rainfall.source],
                [Thermometer, climate.temperature.label, `${climate.temperature.value} ${climate.temperature.unit}`, climate.temperature.source],
                [Droplets, climate.humidity.label, `${climate.humidity.value} ${climate.humidity.unit}`, climate.humidity.source],
                [Wind, climate.wind.label, `${climate.wind.value} ${climate.wind.unit}`, climate.wind.source],
              ].map(([Icon, label, value, source]) => {
                const ClimateIcon = Icon as typeof CloudRain;

                return (
                  <div key={label as string} className="rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-800">
                    <ClimateIcon className="mx-auto mb-3 text-sky-500" size={30} />
                    <div className="text-sm text-slate-500">{label as string}</div>
                    <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                      {value as string}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {source as string}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
