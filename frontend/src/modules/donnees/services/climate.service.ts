import { api } from '../../../services/api';

export type ClimateSyncResponse = {
  message: string;
  script: string;
  status: 'SUCCESS' | 'FAILED' | string;
  durationMs: number;
  error?: string;
};

export const climateFrontendService = {
  async syncNasaPower() {
    const response = await api.post<ClimateSyncResponse>(
      '/climate/sync-nasa-power',
      undefined,
      {
        timeout: 20 * 60 * 1000,
      },
    );

    return response.data;
  },
};
