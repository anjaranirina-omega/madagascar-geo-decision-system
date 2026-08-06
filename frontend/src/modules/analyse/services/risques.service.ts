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

export type SpecificRiskType = 'FLOOD' | 'DROUGHT' | 'LANDSLIDE' | 'CYCLONE';

export type RiskModelPart = 'HAZARD' | 'RISK';

export type RiskModelWeight = {
  id: string;
  riskType: SpecificRiskType;
  modelPart: RiskModelPart;
  criterion: string;
  label: string;
  weight: number;
  description?: string | null;
  isActive: boolean;
};

export type UpdateRiskModelWeightsPayload = {
  riskType: SpecificRiskType;
  weights: {
    modelPart: RiskModelPart;
    criterion: string;
    weight: number;
  }[];
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

  async findRiskModelWeights(riskType: SpecificRiskType) {
    const response = await api.get<RiskModelWeight[]>(
      `/risques/model-weights/${riskType}`,
    );

    return response.data;
  },

  async updateRiskModelWeights(payload: UpdateRiskModelWeightsPayload) {
    const response = await api.put<RiskModelWeight[]>(
      `/risques/model-weights/${payload.riskType}`,
      payload,
    );

    return response.data;
  },

  async resetRiskModelWeights() {
    const response = await api.post<RiskModelWeight[]>(
      '/risques/model-weights/reset-defaults',
    );

    return response.data;
  },
};
