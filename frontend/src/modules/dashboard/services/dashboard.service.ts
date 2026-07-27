import { api } from '../../../services/api';

export type DashboardSummary = {
  riskMeanNational: number;
  criticalZones: number;
  highZones: number;
  activeAlerts: number;
  criticalAlerts: number;
  totalAlerts: number;
  lastUpdate: string | null;
};

export type TopRiskZone = {
  zoneType: string;
  zoneId: string;
  zoneNom: string;
  populationExposed?: number;
  areaKm2?: number;
  riskMean?: number;
  riskMax?: number;
  riskLevel?: string;
  updatedAt?: string;
};

export type RiskDistribution = {
  FAIBLE: number;
  MOYEN: number;
  ELEVE: number;
  CRITIQUE: number;
};

export type AlertsSummary = {
  total: number;
  active: number;
  resolved: number;
  ignored: number;
  critical: number;
  high: number;
};

export type ClimateIndicators = {
  rainfall: {
    label: string;
    value: number;
    unit: string;
    source: string;
  };
  temperature: {
    label: string;
    value: number;
    unit: string;
    source: string;
  };
  humidity: {
    label: string;
    value: number;
    unit: string;
    source: string;
  };
  wind: {
    label: string;
    value: number;
    unit: string;
    source: string;
  };
};

export const dashboardService = {
  async getSummary() {
    const response = await api.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },

  async getTopRiskZones() {
    const response = await api.get<TopRiskZone[]>('/dashboard/top-risk-zones');
    return response.data;
  },

  async getRiskDistribution() {
    const response = await api.get<RiskDistribution>(
      '/dashboard/risk-distribution',
    );
    return response.data;
  },

  async getAlertsSummary() {
    const response = await api.get<AlertsSummary>('/dashboard/alerts-summary');
    return response.data;
  },

  async getClimateIndicators() {
    const response = await api.get<ClimateIndicators>(
      '/dashboard/climate-indicators',
    );
    return response.data;
  },
};
