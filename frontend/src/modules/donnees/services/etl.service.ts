import { api } from '../../../services/api';

export type EtlPipelineStepResult = {
  name: string;
  script: string;
  status: 'SUCCESS' | 'FAILED' | string;
  durationMs: number;
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
        /**
         * Le pipeline complet peut durer plusieurs minutes :
         * CHIRPS + risques global/inondation/sécheresse + statistiques zonales.
         */
        timeout: 20 * 60 * 1000,
      },
    );

    return response.data;
  },
};
