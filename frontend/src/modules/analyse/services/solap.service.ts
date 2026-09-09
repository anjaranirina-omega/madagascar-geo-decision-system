import { api } from '../../../services/api';

export interface SolapCubeRecord {
  riskType: string;
  riskLabel?: string;
  zoneType: string;
  zoneId: string;
  zoneCode: string;
  zoneNom: string;
  year?: number;
  month?: number;
  riskMean: number;
  riskMax: number;
  hazardMean?: number;
  populationExposed?: number;
  areaKm2?: number;
  recordsCount?: number;
}

export interface SolapSummaryRecord {
  riskType: string;
  riskLabel?: string;
  zoneType: string;
  riskMean: number;
  riskMax: number;
  hazardMean?: number;
  populationExposed?: number;
  zoneCount: number;
  recordsCount: number;
}

export interface SolapTimeSeriesRecord {
  riskType: string;
  riskLabel?: string;
  date: string;
  year: number;
  month: number;
  riskMean: number;
  riskMax: number;
  hazardMean?: number;
  populationExposed?: number;
  recordsCount: number;
}

export const solapService = {
  async getRiskCube(params?: {
    riskType?: string;
    zoneType?: string;
    year?: number;
    month?: number;
    limit?: number;
  }) {
    const response = await api.get<SolapCubeRecord[]>('/solap/risk-cube', { params });
    return response.data;
  },

  async getRiskSummary(params?: {
    riskType?: string;
    zoneType?: string;
    year?: number;
    month?: number;
  }) {
    const response = await api.get<SolapSummaryRecord[]>('/solap/risk-summary', { params });
    return response.data;
  },

  async getRiskDrilldown(params: {
    riskType?: string;
    fromLevel?: string;
    zoneId?: string;
    year?: number;
    month?: number;
  }) {
    const response = await api.get<SolapCubeRecord[]>('/solap/risk-drilldown', { params });
    return response.data;
  },

  async getRiskTimeSeries(params?: {
    riskType?: string;
    zoneType?: string;
    zoneId?: string;
  }) {
    const response = await api.get<SolapTimeSeriesRecord[]>('/solap/risk-timeseries', { params });
    return response.data;
  },
};
