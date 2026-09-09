import { api } from '../../../services/api';

export interface AhpCriterionInfo {
  code: string;
  label: string;
  description: string;
}

export interface AhpCriteriaCategories {
  climatic: AhpCriterionInfo[];
  geographic: AhpCriterionInfo[];
  socio_economic: AhpCriterionInfo[];
}

export interface AhpCalculatePayload {
  criteria: string[];
  matrix: number[][];
  normalizedValues?: Record<string, number>;
}

export interface AhpCalculateResponse {
  weights: Record<string, number>;
  consistencyRatio: number;
  isConsistent: boolean;
  lambdaMax: number;
  consistencyIndex: number;
  riskIndex: number;
  alertLevel: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  engine: 'fastapi' | 'internal';
}

export interface AhpHealthResponse {
  module: string;
  status: string;
  engineUrl: string;
  engineStatus: string;
  engineDetails?: any;
}

export const ahpService = {
  async getHealth(): Promise<AhpHealthResponse> {
    const response = await api.get<AhpHealthResponse>('/ahp/health');
    return response.data;
  },

  async getCriteria(): Promise<AhpCriteriaCategories> {
    const response = await api.get<AhpCriteriaCategories>('/ahp/criteria');
    return response.data;
  },

  async calculate(payload: AhpCalculatePayload): Promise<AhpCalculateResponse> {
    const response = await api.post<AhpCalculateResponse>('/ahp/calculate', payload);
    return response.data;
  },
};
