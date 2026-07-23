import { api } from '../../../services/api';

export type RiskCriterionCode =
  | 'RAINFALL'
  | 'SLOPE'
  | 'POPULATION'
  | 'LANDCOVER';

export type CriteriaWeight = {
  id: string;
  criterionCode: RiskCriterionCode;
  label: string;
  weight: number;
  isActive: boolean;
};

export type UpdateCriteriaWeightsPayload = {
  weights: {
    criterionCode: RiskCriterionCode;
    weight: number;
  }[];
};

export type RecalculateRasterResponse = {
  message: string;
  logs?: string[];
};

export const risquesService = {
  async findWeights() {
    const response = await api.get<CriteriaWeight[]>(
      '/risques/criteria-weights',
    );

    return response.data;
  },

  async updateWeights(payload: UpdateCriteriaWeightsPayload) {
    const response = await api.put<CriteriaWeight[]>(
      '/risques/criteria-weights',
      payload,
    );

    return response.data;
  },

  async recalculateRaster() {
    const response = await api.post<RecalculateRasterResponse>(
      '/risques/recalculate-raster',
    );

    return response.data;
  },
};
