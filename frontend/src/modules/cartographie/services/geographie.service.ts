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

export type ZoneSummary = {
  zone: {
    id: string;
    code: string;
    nom: string;
    type: string;
  };
  populationExposed: number;
  areaKm2: number;
  activeAlerts: number;
  lastUpdated: string | null;
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

  async getSummary(type: BoundaryLevel | string, id: string) {
    const normalizedType =
      type === 'regions'
        ? 'region'
        : type === 'districts'
          ? 'district'
          : type === 'communes'
            ? 'commune'
            : type;

    const response = await api.get<ZoneSummary>('/geographie/summary', {
      params: {
        type: normalizedType,
        id,
      },
    });

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
