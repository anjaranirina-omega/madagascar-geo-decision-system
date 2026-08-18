import {
  Activity,
  AlertTriangle,
  CloudRain,
  RefreshCw,
  ThermometerSun,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  OperationalRiskSignal,
  OperationalRiskType,
  operationalSignalsService,
} from '../services/operational-signals.service';

const riskLabels: Record<OperationalRiskType, string> = {
  FLOOD: 'Inondation',
  DROUGHT: 'Sécheresse / chaleur',
  LANDSLIDE: 'Glissement',
  CYCLONE: 'Vent / cyclone',
};

const riskIcons: Record<OperationalRiskType, typeof Waves> = {
  FLOOD: Waves,
  DROUGHT: ThermometerSun,
  LANDSLIDE: AlertTriangle,
  CYCLONE: Zap,
};

const levelLabels = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique',
};

const levelClasses = {
  FAIBLE: 'border-green-200 bg-green-50 text-green-700',
  MOYEN: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  ELEVE: 'border-orange-200 bg-orange-50 text-orange-700',
  CRITIQUE: 'border-red-200 bg-red-50 text-red-700',
};

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Indian/Antananarivo',
  }).format(new Date(value));
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: digits,
  });
}

function WeatherDetails({ signal }: { signal: OperationalRiskSignal }) {
  const details = signal.details ?? {};

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 md:grid-cols-4">
      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <div className="font-bold text-slate-700 dark:text-slate-200">Temp.</div>
        {formatNumber(details.temperature)} °C
      </div>

      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <div className="font-bold text-slate-700 dark:text-slate-200">Pluie</div>
        {formatNumber(details.rainfall)} mm
      </div>

      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <div className="font-bold text-slate-700 dark:text-slate-200">Vent</div>
        {formatNumber(details.windSpeed)} m/s
      </div>

      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <div className="font-bold text-slate-700 dark:text-slate-200">Rafales</div>
        {formatNumber(details.windGust)} m/s
      </div>
    </div>
  );
}

export default function OperationalSignalsPanel() {
  const [signals, setSignals] = useState<OperationalRiskSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [riskType, setRiskType] = useState<OperationalRiskType | 'ALL'>('ALL');
  const [zoneType, setZoneType] = useState('region');
  const [message, setMessage] = useState('');

  const loadSignals = async () => {
    setLoading(true);

    try {
      const data = await operationalSignalsService.findAll({
        zoneType,
        riskType: riskType === 'ALL' ? undefined : riskType,
      });

      setSignals(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskType, zoneType]);

  const recompute = async () => {
    setActionLoading(true);
    setMessage('');

    try {
      const result = await operationalSignalsService.recompute(zoneType);

      setMessage(result.message);
      setSignals(result.signals);
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: signals.length,
      elevated: signals.filter((item) =>
        ['ELEVE', 'CRITIQUE'].includes(item.signalLevel),
      ).length,
      critical: signals.filter((item) => item.signalLevel === 'CRITIQUE').length,
      max:
        signals.length > 0
          ? Math.max(...signals.map((item) => Number(item.signalScore ?? 0)))
          : 0,
    };
  }, [signals]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
              <Activity size={26} />
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Signaux opérationnels temps réel
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Les signaux combinent le risque de fond issu des indicateurs
              zonaux avec les dernières observations météo OpenWeather par
              région. Ils ne remplacent pas les alertes, mais servent de couche
              opérationnelle de surveillance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={zoneType}
              onChange={(event) => setZoneType(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="region">Régions</option>
            </select>

            <select
              value={riskType}
              onChange={(event) =>
                setRiskType(event.target.value as OperationalRiskType | 'ALL')
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="ALL">Tous risques</option>
              <option value="FLOOD">Inondation</option>
              <option value="DROUGHT">Sécheresse / chaleur</option>
              <option value="LANDSLIDE">Glissement</option>
              <option value="CYCLONE">Vent / cyclone</option>
            </select>

            <button
              type="button"
              onClick={loadSignals}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button
              type="button"
              onClick={recompute}
              disabled={actionLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 text-sm font-extrabold text-white shadow-lg"
            >
              <CloudRain size={18} />
              {actionLoading ? 'Recalcul...' : 'Recalculer signaux'}
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SignalStatCard label="Total" value={stats.total} />
        <SignalStatCard label="Élevés / critiques" value={stats.elevated} />
        <SignalStatCard label="Critiques" value={stats.critical} />
        <SignalStatCard label="Score max" value={stats.max.toFixed(1)} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex h-72 items-center justify-center text-slate-500">
            <RefreshCw className="mr-3 animate-spin" size={22} />
            Chargement des signaux...
          </div>
        ) : signals.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-center">
            <Activity size={44} className="mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 dark:text-slate-200">
              Aucun signal opérationnel disponible
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Lancez d’abord la synchronisation météo régionale puis le recalcul
              des signaux.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {signals.map((signal) => {
              const Icon = riskIcons[signal.riskType];

              return (
                <div key={signal.id} className="p-5 transition hover:bg-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <Icon size={24} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">
                            {signal.zoneNom}
                          </h3>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">
                            {riskLabels[signal.riskType]}
                          </span>

                          <span
                            className={[
                              'rounded-full border px-2.5 py-1 text-xs font-black',
                              levelClasses[signal.signalLevel],
                            ].join(' ')}
                          >
                            {levelLabels[signal.signalLevel]}
                          </span>
                        </div>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                          {signal.message}
                        </p>

                        <WeatherDetails signal={signal} />
                      </div>
                    </div>

                    <div className="min-w-[150px] rounded-2xl bg-slate-50 p-4 text-right">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Score opérationnel
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-900">
                        {formatNumber(signal.signalScore)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Risque fond max : {formatNumber(signal.backgroundRiskMax)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Facteur météo :{' '}
                        {signal.weatherFactor !== null &&
                        signal.weatherFactor !== undefined
                          ? `${(signal.weatherFactor * 100).toFixed(0)}%`
                          : '—'}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        {formatDate(signal.observedAt)}
                      </div>
                    </div>
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

function SignalStatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
