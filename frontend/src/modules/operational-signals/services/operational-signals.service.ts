import { api } from '../../../services/api';

export type OperationalRiskType = 'FLOOD' | 'DROUGHT' | 'LANDSLIDE' | 'CYCLONE';

export type OperationalSignalLevel = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';

export type OperationalRiskSignal = {
  id: string;
  riskType: OperationalRiskType;
  zoneType: string;
  zoneId: string;
  zoneNom: string;
  backgroundRiskMax?: number | null;
  backgroundRiskMean?: number | null;
  weatherFactor?: number | null;
  signalScore: number;
  signalLevel: OperationalSignalLevel;
  message: string;
  observedAt?: string | null;
  details?: {
    temperature?: number | null;
    humidity?: number | null;
    windSpeed?: number | null;
    windGust?: number | null;
    rainfall?: number | null;
    rain1h?: number | null;
    rain3h?: number | null;
    clouds?: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type RecomputeOperationalSignalsResponse = {
  message: string;
  zoneType: string;
  count: number;
  signals: OperationalRiskSignal[];
};

export const operationalSignalsService = {
  async findAll(params?: {
    riskType?: OperationalRiskType;
    zoneType?: string;
  }) {
    const response = await api.get<OperationalRiskSignal[]>(
      '/operational-signals',
      {
        params,
      },
    );

    return response.data;
  },

  async findCritical() {
    const response = await api.get<OperationalRiskSignal[]>(
      '/operational-signals/critical',
    );

    return response.data;
  },

  async recompute(zoneType = 'region') {
    const response = await api.post<RecomputeOperationalSignalsResponse>(
      '/operational-signals/recompute',
      undefined,
      {
        params: {
          zoneType,
        },
      },
    );

    return response.data;
  },
};
