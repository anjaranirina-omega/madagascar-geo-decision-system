import { api } from '../../../services/api';

export type EtlStepResult = {
  name: string;
  script: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  stdout?: string;
  stderr?: string;
  error?: string;
};

export type EtlRiskPipelineResponse = {
  message: string;
  steps: EtlStepResult[];
  alertes?: unknown;
  alertWarning?: string | null;
};

export const etlFrontendService = {
  async runRiskPipeline() {
    const response = await api.post<EtlRiskPipelineResponse>(
      '/etl/risk-pipeline/run',
    );

    return response.data;
  },
};
