import { api } from '../../../services/api';

export type RasterLayerMetadata = {
  id: string;
  name: string;
  type: string;
  filePath: string;
  description?: string | null;
  crs?: string | null;
  resolutionX?: number | null;
  resolutionY?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  meanValue?: number | null;
  width?: number | null;
  height?: number | null;
  bounds?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const rasterFrontendService = {
  async findByType(type: string) {
    const response = await api.get<RasterLayerMetadata[]>('/rasters', {
      params: {
        type,
      },
    });

    return response.data;
  },
};
