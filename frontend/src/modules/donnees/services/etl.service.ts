import { api } from '../../../services/api';

export type EtlPipelineStepResult = {
  name: string;
  script: string;
  status: 'SUCCESS' | 'FAILED' | string;
  durationMs: number;
  stdout?: string;
  stderr?: string;
  error?: string;
};

export type EtlRiskPipelineResponse = {
  message: string;
  steps: EtlPipelineStepResult[];
  alertes?: unknown;
  alertWarning?: string | null;
  alertSkipped?: boolean;
};

export const etlFrontendService = {
  async runRiskPipeline() {
    const response = await api.post<EtlRiskPipelineResponse>(
      '/etl/risk-pipeline/run',
      undefined,
      {
        timeout: 10 * 60 * 1000,
      },
    );

    return response.data;
  },
};
