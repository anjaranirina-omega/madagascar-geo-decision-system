import { api } from '../../services/api';

export type AlerteNiveau = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
export type AlerteStatus = 'ACTIVE' | 'RESOLUE' | 'IGNOREE';

export type Alerte = {
  id: string;
  type: string;
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

  async generateFromRisk(zoneType = 'region') {
    const response = await api.post('/alertes/generate-from-risk', {
      zoneType,
      thresholdEleve: 61,
      thresholdCritique: 81,
    });

    return response.data;
  },

  async generateOperationalAlerts(payload: {
    zoneType?: string;
  }) {
    const response = await api.post('/alertes/generate-operational-alerts', payload);

    return response.data;
  },

  async generateValidatedRiskAlerts(payload: {
    zoneType?: string;
    riskTypes?: string[];
    riskMeanThreshold?: number;
    riskMaxThreshold?: number;
    limit?: number;
  }) {
    const response = await api.post(
      '/alertes/generate-validated-risk-alerts',
      payload,
    );

    return response.data;
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
