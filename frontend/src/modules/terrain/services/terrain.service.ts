import { api } from '../../../services/api';

export type InterventionStatus = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
export type InterventionType = 'EVALUATION' | 'SECOURS' | 'EVACUATION' | 'DISTRIBUTION' | 'REHABILITATION' | 'AUTRE';

export interface InterventionItem {
  id: string;
  type: InterventionType;
  statut: InterventionStatus;
  description?: string;
  dateIntervention: string;
  latitude?: number;
  longitude?: number;
  commune?: {
    id: string;
    nom: string;
    code?: string;
  };
  agent?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterventionPayload {
  type: InterventionType;
  statut?: InterventionStatus;
  description?: string;
  dateIntervention: string;
  communeId?: string;
  agentId?: string;
  latitude?: number;
  longitude?: number;
}

export interface OperationalSignalItem {
  id: string;
  riskType: 'FLOOD' | 'DROUGHT' | 'LANDSLIDE' | 'CYCLONE';
  zoneType: string;
  zoneId: string;
  zoneNom: string;
  signalScore: number;
  signalLevel: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  message: string;
  observedAt?: string;
}

export const terrainService = {
  async getInterventions(): Promise<InterventionItem[]> {
    const response = await api.get<InterventionItem[]>('/interventions');
    return response.data;
  },

  async createIntervention(payload: CreateInterventionPayload): Promise<InterventionItem> {
    const response = await api.post<InterventionItem>('/interventions', payload);
    return response.data;
  },

  async updateIntervention(id: string, payload: Partial<CreateInterventionPayload>): Promise<InterventionItem> {
    const response = await api.patch<InterventionItem>(`/interventions/${id}`, payload);
    return response.data;
  },

  async getOperationalSignals(): Promise<OperationalSignalItem[]> {
    const response = await api.get<OperationalSignalItem[]>('/operational-signals');
    return response.data;
  },

  async getCriticalSignals(): Promise<OperationalSignalItem[]> {
    const response = await api.get<OperationalSignalItem[]>('/operational-signals/critical');
    return response.data;
  },
};
