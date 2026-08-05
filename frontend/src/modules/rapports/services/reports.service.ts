import { api } from '../../../services/api';

export type GeneratedReport = {
  id: string;
  title: string;
  reportType: string;
  format: string;
  fileName: string;
  mimeType: string;
  filters?: Record<string, unknown> | null;
  generatedBy?: string | null;
  generatedAtLocal?: string | null;
  version: string;
  status: string;
  fileSizeBytes?: number | null;
  createdAt: string;
  updatedAt: string;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

async function downloadReport(endpoint: string, filename: string, params?: unknown) {
  const response = await api.get(endpoint, {
    params,
    responseType: 'blob',
    timeout: 5 * 60 * 1000,
  });

  downloadBlob(response.data, filename);
}

export const reportsService = {
  async getHistory(limit = 50) {
    const response = await api.get<GeneratedReport[]>('/reports/history', {
      params: {
        limit,
      },
    });

    return response.data;
  },

  async downloadHistory(report: GeneratedReport) {
    return downloadReport(
      `/reports/history/${report.id}/download`,
      report.fileName,
    );
  },

  async deleteHistory(id: string) {
    await api.delete(`/reports/history/${id}`);
  },

  downloadNationalPdf() {
    return downloadReport(
      '/reports/national-risk.pdf',
      'riskclim-mg-rapport-national.pdf',
    );
  },

  downloadNationalExcel() {
    return downloadReport(
      '/reports/national-risk.xlsx',
      'riskclim-mg-rapport-national.xlsx',
    );
  },

  downloadRiskSummaryCsv() {
    return downloadReport('/reports/risk-summary.csv', 'risk-summary.csv');
  },

  downloadTopRiskZonesCsv(params?: {
    riskType?: string;
    zoneType?: string;
    limit?: number;
  }) {
    return downloadReport('/reports/top-risk-zones.csv', 'top-risk-zones.csv', params);
  },

  downloadTopRiskZonesExcel(params?: {
    riskType?: string;
    zoneType?: string;
    limit?: number;
  }) {
    return downloadReport(
      '/reports/top-risk-zones.xlsx',
      'top-risk-zones.xlsx',
      params,
    );
  },

  downloadTopRiskZonesPdf(params?: {
    riskType?: string;
    zoneType?: string;
    limit?: number;
  }) {
    return downloadReport('/reports/top-risk-zones.pdf', 'top-risk-zones.pdf', params);
  },

  downloadDataSourcesCsv() {
    return downloadReport('/reports/data-sources.csv', 'data-sources.csv');
  },

  downloadDataSourcesExcel() {
    return downloadReport('/reports/data-sources.xlsx', 'data-sources.xlsx');
  },

  downloadEtlJobsCsv() {
    return downloadReport('/reports/etl-jobs.csv', 'etl-jobs.csv');
  },

  downloadEtlJobsExcel() {
    return downloadReport('/reports/etl-jobs.xlsx', 'etl-jobs.xlsx');
  },
};
