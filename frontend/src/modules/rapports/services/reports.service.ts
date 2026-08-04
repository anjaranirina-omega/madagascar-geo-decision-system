import { api } from '../../../services/api';

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
