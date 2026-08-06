import { api } from '../../../services/api';

export type CurrentWeather = {
  id: string;
  source: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  rainfall?: number;
  weatherMain?: string;
  weatherDescription?: string;
  observedAt: string;
  createdAt: string;
};

export const meteoService = {
  async getCurrent(lat: number, lng: number) {
    const response = await api.get<CurrentWeather>('/meteo/current', {
      params: {
        lat,
        lng,
      },
    });

    return response.data;
  },

  async findLatest(limit = 10) {
    const response = await api.get<CurrentWeather[]>('/meteo/latest', {
      params: {
        limit,
      },
    });

    return response.data;
  },
};
