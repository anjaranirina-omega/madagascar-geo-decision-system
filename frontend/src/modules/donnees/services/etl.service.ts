import { api } from '../../../services/api';

export type EtlPipelineStepResult = {
  name: string;
  script: string;
  status: 'SUCCESS' | 'FAILED' | string;
  durationMs: number;
  error?: string;
};

export type EtlPipelineJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED';

export type EtlPipelineJob = {
  id: string;
  type: 'RISK_PIPELINE' | string;
  status: EtlPipelineJobStatus;
  message?: string | null;
  steps?: EtlPipelineStepResult[] | null;
  alertWarning?: string | null;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  createdAt: string;
  updatedAt: string;
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
        timeout: 20 * 60 * 1000,
      },
    );

    return response.data;
  },

  async startRiskPipeline() {
    const response = await api.post<EtlPipelineJob>('/etl/risk-pipeline/start');

    return response.data;
  },

  async getRiskPipelineJob(id: string) {
    const response = await api.get<EtlPipelineJob>(
      `/etl/risk-pipeline/jobs/${id}`,
    );

    return response.data;
  },

  async getLatestRiskPipelineJobs(limit = 10) {
    const response = await api.get<EtlPipelineJob[]>(
      '/etl/risk-pipeline/jobs',
      {
        params: {
          limit,
        },
      },
    );

    return response.data;
  },
};
