import { api } from '../../../services/api';

export type DataSourceStatus =
  | 'CONNECTED'
  | 'PENDING'
  | 'FAILED'
  | 'DISABLED';

export type DataSourceCategory =
  | 'CLIMATE'
  | 'TOPOGRAPHY'
  | 'POPULATION'
  | 'LANDCOVER'
  | 'HYDROLOGY'
  | 'WEATHER';

export type DataSourceItem = {
  id: string;
  code: string;
  name: string;
  category: DataSourceCategory;
  provider?: string | null;
  description?: string | null;
  url?: string | null;
  status: DataSourceStatus;
  lastSyncAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
};

export const dataSourcesFrontendService = {
  async findAll() {
    const response = await api.get<DataSourceItem[]>('/data-sources');

    return response.data;
  },
};
