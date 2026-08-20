import { api } from '../../../services/api';

export type SettingsDataSource = {
  code: string;
  name: string;
  category: string;
  provider?: string | null;
  status: 'CONNECTED' | 'PENDING' | 'FAILED' | 'DISABLED' | string;
  lastSyncAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SettingsSummary = {
  application: {
    name: string;
    environment: string;
    version: string;
  };

  platformHealth: {
    sourcesTotal: number;
    connectedSources: number;
    failedSources: number;
    pendingSources: number;
    activeRasters: number;
    latestRasterUpdate: string | null;
    latestEtlJob: any | null;
    activeAlerts: number;
    criticalAlerts: number;
    latestWeatherAt: string | null;
    regionalWeatherZones: number;
  };

  sources: SettingsDataSource[];

  pipelines: {
    riskPipelineAutoEnabled: boolean;
    riskPipelineCron: string;
    etlPipelineGenerateAlerts: boolean;
    nasaPowerAutoEnabled: boolean;
    nasaPowerCron: string;
  };

  realtimeWeather: {
    openWeatherConfigured: boolean;
    realtimeWeatherEnabled: boolean;
    realtimeWeatherCron: string;
    zoneLevel: string;
    regionalWeatherCount: number;
    regionalWeatherZones: number;
    latestWeatherAt: string | null;
  };

  alerts: {
    validatedAlertsAfterPipeline: boolean;
    validatedAlertZoneType: string;
    validatedAlertRiskMeanThreshold: number;
    validatedAlertRiskMaxThreshold: number;
    validatedAlertZoneLimit: number;
    legacyAutoAlertsEnabled: boolean;
  };

  security: {
    jwtConfigured: boolean;
    smtpConfigured: boolean;
    adminContactConfigured: boolean;
  };

  externalApiConfiguration: {
    openWeatherApiKeyConfigured: boolean;
    openTopographyApiKeyConfigured: boolean;
    nasaPowerConfigured: boolean;
    ibtracsConfigured: boolean;
  };
};

export const settingsService = {
  async getSummary() {
    const response = await api.get<SettingsSummary>('/settings/summary');

    return response.data;
  },
};
