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

const kpis = [
  {
    title: 'Risque moyen national',
    value: '56.4',
    suffix: '/100',
    subtitle: 'Niveau : Moyen',
    icon: TrendingUp,
  },
  {
    title: 'Zones critiques',
    value: '24',
    suffix: '',
    subtitle: 'Zones',
    icon: AlertTriangle,
  },
  {
    title: 'Alertes actives',
    value: '8',
    suffix: '',
    subtitle: 'Alertes',
    icon: Bell,
  },
  {
    title: 'Données mises à jour',
    value: '10:15',
    suffix: '',
    subtitle: "Aujourd'hui",
    icon: UploadCloud,
  },
];

const regions = [
  ['Atsimo Andrefana', 72.8, 'bg-red-500'],
  ['Vatovavy Fitovinany', 68.3, 'bg-orange-500'],
  ['Sofia', 63.1, 'bg-yellow-500'],
  ['Boeny', 59.4, 'bg-yellow-400'],
  ['Analanjirofo', 55.2, 'bg-green-500'],
];

export default function DashboardPage() {
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
                  <span className="text-4xl font-black text-slate-900">
                    {kpi.value}
                  </span>
                  <span className="ml-1 text-slate-500">{kpi.suffix}</span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 text-riskgreen">
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
          <h2 className="mb-6 font-extrabold">Répartition des niveaux de risque</h2>

          <div className="grid grid-cols-[150px_1fr] items-center gap-5">
            <div className="relative h-36 w-36 rounded-full bg-[conic-gradient(#22c55e_0_22%,#eab308_22%_63%,#f97316_63%_89%,#ef4444_89%_100%)]">
              <div className="absolute inset-9 rounded-full bg-white" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-green-500" />Faible</span>
                <strong>22%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-yellow-500" />Moyen</span>
                <strong>41%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-orange-500" />Élevé</span>
                <strong>26%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-red-500" />Critique</span>
                <strong>10%</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-6 font-extrabold">Tendance des risques</h2>

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
          <h2 className="mb-6 font-extrabold">
            Top 5 des régions les plus à risque
          </h2>

          <div className="space-y-5">
            {regions.map(([name, value, color], index) => (
              <div
                key={name}
                className="grid grid-cols-[24px_1fr_54px] items-center gap-3"
              >
                <strong>{index + 1}</strong>

                <div>
                  <div className="mb-2 text-sm font-medium">{name}</div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>

                <strong className="text-sm">{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-6 font-extrabold">
            Indicateurs climatiques
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              [CloudRain, 'Pluie', '45.2 mm'],
              [Thermometer, 'Température', '27.6 °C'],
              [Droplets, 'Humidité', '78 %'],
              [Wind, 'Vent', '12.4 km/h'],
            ].map(([Icon, label, value]) => {
              const ClimateIcon = Icon as typeof CloudRain;

              return (
                <div key={label as string} className="rounded-2xl bg-slate-50 p-5 text-center">
                  <ClimateIcon className="mx-auto mb-3 text-sky-500" size={30} />
                  <div className="text-sm text-slate-500">{label as string}</div>
                  <div className="mt-1 text-2xl font-black">{value as string}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
