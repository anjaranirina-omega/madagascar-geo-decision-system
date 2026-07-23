import { api } from '../../../services/api';

export type BoundaryLevel = 'regions' | 'districts' | 'communes';

export type LocatedZone = {
  latitude: number;
  longitude: number;
  region: null | {
    id: string;
    code: string;
    nom: string;
  };
  district: null | {
    id: string;
    code: string;
    nom: string;
  };
  commune: null | {
    id: string;
    code: string;
    nom: string;
  };
};

export type SearchResultItem = {
  id: string;
  code: string;
  nom: string;
};

export type SearchResponse = {
  regions: SearchResultItem[];
  districts: SearchResultItem[];
  communes: SearchResultItem[];
};

export const geographieFrontendService = {
  async getGeoJson(level: BoundaryLevel) {
    const response = await api.get(`/geographie/${level}/geojson`);
    return response.data;
  },

  async getFeature(level: BoundaryLevel, id: string) {
    const response = await api.get(`/geographie/${level}/${id}`);
    return response.data;
  },

  async search(query: string) {
    const response = await api.get<SearchResponse>('/geographie/search', {
      params: {
        q: query,
      },
    });

    return response.data;
  },

  async locate(latitude: number, longitude: number) {
    const response = await api.get<LocatedZone>('/geographie/locate', {
      params: {
        lat: latitude,
        lng: longitude,
      },
    });

    return response.data;
  },
};
