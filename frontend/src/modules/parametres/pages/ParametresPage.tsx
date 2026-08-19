import {
  Bell,
  CheckCircle2,
  CloudSun,
  Database,
  KeyRound,
  RadioTower,
  RefreshCw,
  Settings,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '../../../shared/components/ui/PageHeader';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import Tabs from '../../../shared/components/ui/Tabs';
import {
  SettingsDataSource,
  SettingsSummary,
  settingsService,
} from '../services/settings.service';

type SettingsTab = 'overview' | 'sources' | 'pipeline' | 'alerts' | 'security';

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Indian/Antananarivo',
  }).format(new Date(value));
}

function BooleanStatus({
  value,
  trueLabel = 'Activé',
  falseLabel = 'Désactivé',
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-black text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
      <CheckCircle2 size={14} />
      {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <XCircle size={14} />
      {falseLabel}
    </span>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800">
      <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </div>

      <div className="text-right text-sm font-black text-slate-900 dark:text-white">
        {typeof value === 'boolean' ? <BooleanStatus value={value} /> : value ?? '—'}
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 text-white">
          {icon}
        </div>
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>

      <div>{children}</div>
    </div>
  );
}

function SourceCard({ source }: { source: SettingsDataSource }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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

      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <div>Dernière réussite : {formatDate(source.lastSuccessAt)}</div>
        <div>Dernière synchronisation : {formatDate(source.lastSyncAt)}</div>
        {source.lastErrorMessage && (
          <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {source.lastErrorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [summary, setSummary] = useState<SettingsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    setLoading(true);

    try {
      const data = await settingsService.getSummary();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        <RefreshCw className="mr-3 animate-spin" size={22} />
        Chargement des paramètres...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        Impossible de charger les paramètres.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres système"
        subtitle="Vue opérationnelle de la configuration RISKCLIM-MG. Les informations sensibles ne sont pas exposées et les paramètres sont affichés en lecture seule."
        icon={<Settings size={28} />}
        actions={
          <button
            type="button"
            onClick={loadSettings}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-900 shadow"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Kpi
          label="Sources connectées"
          value={`${summary.platformHealth.connectedSources}/${summary.platformHealth.sourcesTotal}`}
          sub={`${summary.platformHealth.failedSources} en erreur`}
        />
        <Kpi
          label="Rasters actifs"
          value={summary.platformHealth.activeRasters}
          sub={formatDate(summary.platformHealth.latestRasterUpdate)}
        />
        <Kpi
          label="Météo régionale"
          value={`${summary.platformHealth.regionalWeatherZones}/22`}
          sub={formatDate(summary.platformHealth.latestWeatherAt)}
        />
        <Kpi
          label="Alertes actives"
          value={summary.platformHealth.activeAlerts}
          sub={`${summary.platformHealth.criticalAlerts} critiques`}
        />
      </div>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Vue d’ensemble' },
          { id: 'sources', label: 'Sources', count: summary.sources.length },
          { id: 'pipeline', label: 'Pipelines' },
          { id: 'alerts', label: 'Alertes' },
          { id: 'security', label: 'Sécurité' },
        ]}
      />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SettingsCard title="Plateforme" icon={<Settings size={22} />}>
            <SettingRow label="Application" value={summary.application.name} />
            <SettingRow label="Environnement" value={summary.application.environment} />
            <SettingRow label="Version" value={summary.application.version} />
          </SettingsCard>

          <SettingsCard title="État opérationnel" icon={<ShieldCheck size={22} />}>
            <SettingRow
              label="Dernier ETL"
              value={summary.platformHealth.latestEtlJob?.status ?? '—'}
            />
            <SettingRow
              label="Dernière météo régionale"
              value={formatDate(summary.platformHealth.latestWeatherAt)}
            />
            <SettingRow
              label="Dernier raster"
              value={formatDate(summary.platformHealth.latestRasterUpdate)}
            />
          </SettingsCard>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary.sources.map((source) => (
            <SourceCard key={source.code} source={source} />
          ))}
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SettingsCard title="Pipeline de risque" icon={<Database size={22} />}>
            <SettingRow
              label="Exécution automatique"
              value={summary.pipelines.riskPipelineAutoEnabled}
            />
            <SettingRow label="Planification" value={summary.pipelines.riskPipelineCron} />
            <SettingRow
              label="Alertes météo-risque historiques"
              value={summary.pipelines.etlPipelineGenerateAlerts}
            />
          </SettingsCard>

          <SettingsCard title="NASA POWER" icon={<CloudSun size={22} />}>
            <SettingRow
              label="Synchronisation automatique"
              value={summary.pipelines.nasaPowerAutoEnabled}
            />
            <SettingRow label="Planification" value={summary.pipelines.nasaPowerCron} />
          </SettingsCard>

          <SettingsCard title="OpenWeather temps réel" icon={<RadioTower size={22} />}>
            <SettingRow
              label="Clé OpenWeather configurée"
              value={summary.realtimeWeather.openWeatherConfigured}
            />
            <SettingRow
              label="Ingestion automatique"
              value={summary.realtimeWeather.realtimeWeatherEnabled}
            />
            <SettingRow label="Planification" value={summary.realtimeWeather.realtimeWeatherCron} />
            <SettingRow label="Niveau de zone" value={summary.realtimeWeather.zoneLevel} />
          </SettingsCard>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SettingsCard title="Alertes validées" icon={<Bell size={22} />}>
            <SettingRow
              label="Après pipeline"
              value={summary.alerts.validatedAlertsAfterPipeline}
            />
            <SettingRow label="Niveau administratif" value={summary.alerts.validatedAlertZoneType} />
            <SettingRow label="Seuil risk_mean" value={summary.alerts.validatedAlertRiskMeanThreshold} />
            <SettingRow label="Seuil risk_max" value={summary.alerts.validatedAlertRiskMaxThreshold} />
            <SettingRow label="Limite zones" value={summary.alerts.validatedAlertZoneLimit} />
          </SettingsCard>

          <SettingsCard title="Alertes météo-risque historiques" icon={<Bell size={22} />}>
            <SettingRow
              label="Automatisation héritée"
              value={summary.alerts.legacyAutoAlertsEnabled}
            />
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Les alertes validées et opérationnelles sont privilégiées. Les
              anciennes alertes météo-risque restent disponibles mais désactivées
              par défaut.
            </p>
          </SettingsCard>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SettingsCard title="Sécurité" icon={<KeyRound size={22} />}>
            <SettingRow label="JWT configuré" value={summary.security.jwtConfigured} />
            <SettingRow label="SMTP configuré" value={summary.security.smtpConfigured} />
            <SettingRow
              label="Contact administrateur"
              value={summary.security.adminContactConfigured}
            />
          </SettingsCard>

          <SettingsCard title="Configuration API externe" icon={<RadioTower size={22} />}>
            <SettingRow
              label="OpenWeather API"
              value={summary.externalApiConfiguration.openWeatherApiKeyConfigured}
            />
            <SettingRow
              label="OpenTopography API"
              value={summary.externalApiConfiguration.openTopographyApiKeyConfigured}
            />
            <SettingRow
              label="NASA POWER"
              value={summary.externalApiConfiguration.nasaPowerConfigured}
            />
            <SettingRow
              label="IBTrACS"
              value={summary.externalApiConfiguration.ibtracsConfigured}
            />
          </SettingsCard>
        </div>
      )}
    </div>
  );
}
