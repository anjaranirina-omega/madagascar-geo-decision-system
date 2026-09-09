import { api } from '../../../services/api';

export type DashboardSummary = {
  riskMeanNational: number;
  riskMaxNational: number;
  multiRiskMean: number;
  multiRiskMax: number;
  criticalZones: number;
  highZones: number;
  elevatedOrCriticalZones: number;
  populationExposed: number;
  connectedSources: number;
  totalSources: number;
  failedSources: number;
  pendingSources: number;
  activeRasters: number;
  latestRasterUpdate: string | null;
  latestEtlJob: null | {
    id: string;
    status: string;
    message?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
    duration_ms?: number | null;
    updated_at?: string | null;
  };
  activeAlerts: number;
  criticalAlerts: number;
  totalAlerts: number;
  lastUpdate: string | null;
};

export type RiskDistribution = {
  FAIBLE: number;
  MOYEN: number;
  ELEVE: number;
  CRITIQUE: number;
};

export type TopRiskZone = {
  riskType: string;
  riskLabel: string;
  zoneType: string;
  zoneId: string;
  zoneCode?: string | null;
  zoneNom: string;
  populationExposed?: number | null;
  areaKm2?: number | null;
  riskMean?: number | null;
  riskMax?: number | null;
  hazardMean?: number | null;
  riskLevel?: string | null;
  updatedAt?: string | null;
};

export type RiskByRegionItem = {
  zoneId: string;
  zoneNom: string;
  risks: Record<
    string,
    {
      riskMean: number | null;
      riskMax: number | null;
      riskLevel: string | null;
    }
  >;
};

export type DashboardDataSource = {
  code: string;
  name: string;
  category: string;
  provider?: string | null;
  status: string;
  lastSyncAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
};

export type DashboardEtlJob = {
  id: string;
  type: string;
  status: string;
  message?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DashboardRaster = {
  type: string;
  name: string;
  filePath: string;
  minValue?: number | null;
  maxValue?: number | null;
  meanValue?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RiskTimeSeriesPoint = {
  riskType: string;
  riskLabel: string;
  date: string;
  year: number;
  month: number;
  riskMean?: number | null;
  riskMax?: number | null;
  hazardMean?: number | null;
  populationExposed?: number | null;
  recordsCount: number;
};

export type ClimateIndicators = {
  date: string | null;
  temperature: {
    label: string;
    value: number | null;
    unit: string;
    source: string;
  };
  humidity: {
    label: string;
    value: number | null;
    unit: string;
    source: string;
  };
  wind: {
    label: string;
    value: number | null;
    unit: string;
    source: string;
  };
  precipitation: {
    label: string;
    value: number | null;
    unit: string;
    source: string;
  };
};

export const dashboardService = {
  async getSummary() {
    const response = await api.get<DashboardSummary>('/dashboard/summary');

    return response.data;
  },

  async getTopRiskZones(params?: {
    limit?: number;
    riskType?: string;
    zoneType?: string;
  }) {
    const response = await api.get<TopRiskZone[]>('/dashboard/top-risk-zones', {
      params,
    });

    return response.data;
  },

  async getRiskDistribution(params?: {
    riskType?: string;
    zoneType?: string;
  }) {
    const response = await api.get<RiskDistribution>(
      '/dashboard/risk-distribution',
      {
        params,
      },
    );

    return response.data;
  },

  async getRiskByRegion() {
    const response = await api.get<RiskByRegionItem[]>(
      '/dashboard/risk-by-region',
    );

    return response.data;
  },

  async getDataSources() {
    const response = await api.get<DashboardDataSource[]>(
      '/dashboard/data-sources',
    );

    return response.data;
  },

  async getLatestEtlJobs(limit = 5) {
    const response = await api.get<DashboardEtlJob[]>('/dashboard/etl-jobs', {
      params: {
        limit,
      },
    });

    return response.data;
  },

  async getRasters() {
    const response = await api.get<DashboardRaster[]>('/dashboard/rasters');

    return response.data;
  },

  async getRiskTimeSeries(params?: {
    riskType?: string;
    zoneType?: string;
    zoneId?: string;
  }) {
    const response = await api.get<RiskTimeSeriesPoint[]>(
      '/solap/risk-timeseries',
      {
        params,
      },
    );

    return response.data;
  },

  async getClimateIndicators() {
    const response = await api.get<ClimateIndicators>(
      '/dashboard/climate-indicators',
    );

    return response.data;
  },
};
