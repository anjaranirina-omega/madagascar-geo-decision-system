import { api } from '../../services/api';

export type AlerteNiveau = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
export type AlerteStatus = 'ACTIVE' | 'RESOLUE' | 'IGNOREE';
export type AlerteType =
  | 'RISQUE_GLOBAL'
  | 'INONDATION'
  | 'CYCLONE'
  | 'SECHERESSE'
  | 'GLISSEMENT_TERRAIN'
  | 'VENT_VIOLENT';

export type Alerte = {
  id: string;
  type: AlerteType | string;
  niveau: AlerteNiveau;
  titre: string;
  message: string;
  zoneType?: string;
  zoneId?: string;
  zoneNom?: string;
  riskValue?: number;
  riskMean?: number;
  populationExposed?: number;
  status: AlerteStatus;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const alertesService = {
  async findAll() {
    const response = await api.get<Alerte[]>('/alertes');
    return response.data;
  },

  async findActive() {
    const response = await api.get<Alerte[]>('/alertes/active');
    return response.data;
  },

  async generateFromRisk(
    payload:
      | {
          zoneType?: string;
          thresholdEleve?: number;
          thresholdCritique?: number;
        }
      | string = 'region',
  ) {
    const body =
      typeof payload === 'string'
        ? {
            zoneType: payload,
            thresholdEleve: 61,
            thresholdCritique: 81,
          }
        : {
            zoneType: payload?.zoneType ?? 'region',
            thresholdEleve: payload?.thresholdEleve ?? 61,
            thresholdCritique: payload?.thresholdCritique ?? 81,
          };

    const response = await api.post('/alertes/generate-from-risk', body);

    return response.data;
  },

  async generateOperationalAlerts(payload: {
    zoneType?: string;
  }) {
    const response = await api.post('/alertes/generate-operational-alerts', payload);

    return response.data;
  },

  async generateValidatedRiskAlerts(
    payload: {
      zoneType?: string;
      thresholdEleve?: number;
      thresholdCritique?: number;
      riskTypes?: string[];
      riskMeanThreshold?: number;
      riskMaxThreshold?: number;
      limit?: number;
    } = {},
  ) {
    // Redirection vers la route backend réelle POST /alertes/generate-from-risk
    return this.generateFromRisk({
      zoneType: payload.zoneType ?? 'region',
      thresholdEleve: payload.thresholdEleve ?? payload.riskMeanThreshold ?? 61,
      thresholdCritique: payload.thresholdCritique ?? payload.riskMaxThreshold ?? 81,
    });
  },

  async resolve(id: string) {
    const response = await api.patch<Alerte>(`/alertes/${id}/resolve`);
    return response.data;
  },

  async ignore(id: string) {
    const response = await api.patch<Alerte>(`/alertes/${id}/ignore`);
    return response.data;
  },

  async generateWeatherRisk(payload: {
    latitude: number;
    longitude: number;
    zoneType?: string;
    riskThreshold?: number;
    rainfallThreshold?: number;
    windThreshold?: number;
  }) {
    const response = await api.post('/alertes/generate-weather-risk', payload);
    return response.data;
  },

  async autoGenerateWeatherRisk() {
    const response = await api.post('/alertes/auto-generate-weather-risk');
    return response.data;
  },
};
