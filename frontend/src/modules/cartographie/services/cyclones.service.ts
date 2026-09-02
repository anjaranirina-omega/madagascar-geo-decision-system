import { api } from '../../../services/api';

export type ActiveCyclone = {
  id: string;
  gdacsEventId: string;
  gdacsEpisodeId?: string | null;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  windSpeed?: string | null;
  severityLevel: string;
  country?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  trackGeojson?: {
    type: string;
    features: Array<{
      type: string;
      geometry: {
        type: string;
        coordinates: any;
      };
      properties?: Record<string, any>;
    }>;
  } | null;
  isActive: boolean;
  fetchedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export const cyclonesService = {
  async getActiveCyclones(all = false): Promise<ActiveCyclone[]> {
    const response = await api.get<ActiveCyclone[]>('/meteo/active-cyclones', {
      params: { all: all ? 'true' : undefined },
    });
    return response.data;
  },

  async getActiveCycloneById(id: string): Promise<ActiveCyclone> {
    const response = await api.get<ActiveCyclone>(`/meteo/active-cyclones/${id}`);
    return response.data;
  },
};
