import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private sendCsv(res: Response, filename: string, content: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send('\uFEFF' + content);
  }

  private sendXlsx(res: Response, filename: string, content: Buffer) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(content);
  }

  private sendPdf(res: Response, filename: string, content: Buffer) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(content);
  }

  @Get('history')
  @Roles('ADMIN', 'ANALYSTE')
  getHistory(@Query('limit') limit?: string) {
    return this.reportsService.findHistory(Number(limit ?? 50));
  }

  @Get('history/:id/download')
  @Roles('ADMIN', 'ANALYSTE')
  async downloadHistory(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reportsService.findGeneratedReport(id);
    const projectRoot = resolve(process.cwd(), '..');
    const absolutePath = join(projectRoot, report.filePath);

    if (!existsSync(absolutePath)) {
      res.status(404).json({
        message: 'Fichier du rapport introuvable.',
      });
      return;
    }

    res.setHeader('Content-Type', report.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.fileName}"`,
    );

    return res.sendFile(absolutePath);
  }

  @Delete('history/:id')
  @Roles('ADMIN', 'ANALYSTE')
  deleteHistory(@Param('id') id: string) {
    return this.reportsService.deleteGeneratedReport(id);
  }


  @Get('risk-comparison')
  @Roles('ADMIN', 'ANALYSTE')
  getRiskComparison(
    @Query('periodAStart') periodAStart: string,
    @Query('periodAEnd') periodAEnd: string,
    @Query('periodBStart') periodBStart: string,
    @Query('periodBEnd') periodBEnd: string,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
  ) {
    return this.reportsService.getRiskComparison({
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
      riskType,
      zoneType,
    });
  }

  @Get('risk-comparison.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async riskComparisonExcel(
    @Res() res: Response,
    @Query('periodAStart') periodAStart: string,
    @Query('periodAEnd') periodAEnd: string,
    @Query('periodBStart') periodBStart: string,
    @Query('periodBEnd') periodBEnd: string,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
  ) {
    const fileName = 'risk-comparison.xlsx';

    const filters = {
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
      riskType,
      zoneType,
    };

    const content = await this.reportsService.getRiskComparisonExcel(filters);

    await this.reportsService.saveGeneratedReport({
      title: 'Comparaison de périodes',
      reportType: 'RISK_COMPARISON',
      format: 'XLSX',
      fileName,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content,
      filters,
    });

    return this.sendXlsx(res, fileName, content);
  }

  @Get('national-risk.pdf')
  @Roles('ADMIN', 'ANALYSTE')
  async nationalRiskPdf(@Res() res: Response) {
    const fileName = 'riskclim-mg-rapport-national.pdf';
    const content = await this.reportsService.getNationalRiskPdf();

    await this.reportsService.saveGeneratedReport({
      title: 'Rapport national multi-risques',
      reportType: 'NATIONAL',
      format: 'PDF',
      fileName,
      mimeType: 'application/pdf',
      content,
      filters: {
        scope: 'national',
      },
    });

    return this.sendPdf(res, fileName, content);
  }

  @Get('national-risk.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async nationalRiskExcel(@Res() res: Response) {
    const fileName = 'riskclim-mg-rapport-national.xlsx';
    const content = await this.reportsService.getNationalRiskExcel();

    await this.reportsService.saveGeneratedReport({
      title: 'Classeur national multi-risques',
      reportType: 'NATIONAL',
      format: 'XLSX',
      fileName,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content,
      filters: {
        scope: 'national',
      },
    });

    return this.sendXlsx(res, fileName, content);
  }

  @Get('risk-summary.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async riskSummaryCsv(@Res() res: Response) {
    const fileName = 'risk-summary.csv';
    const content = await this.reportsService.getRiskSummaryCsv();

    await this.reportsService.saveGeneratedReport({
      title: 'Synthèse des risques',
      reportType: 'RISK_SUMMARY',
      format: 'CSV',
      fileName,
      mimeType: 'text/csv',
      content: '\uFEFF' + content,
    });

    return this.sendCsv(res, fileName, content);
  }

  @Get('top-risk-zones.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async topRiskZonesCsv(
    @Res() res: Response,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('limit') limit?: string,
  ) {
    const fileName = 'top-risk-zones.csv';
    const filters = {
      riskType,
      zoneType,
      limit: Number(limit ?? 100),
    };
    const content = await this.reportsService.getTopRiskZonesCsv(filters);

    await this.reportsService.saveGeneratedReport({
      title: 'Top zones exposées',
      reportType: 'TOP_RISK_ZONES',
      format: 'CSV',
      fileName,
      mimeType: 'text/csv',
      content: '\uFEFF' + content,
      filters,
    });

    return this.sendCsv(res, fileName, content);
  }

  @Get('top-risk-zones.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async topRiskZonesExcel(
    @Res() res: Response,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('limit') limit?: string,
  ) {
    const fileName = 'top-risk-zones.xlsx';
    const filters = {
      riskType,
      zoneType,
      limit: Number(limit ?? 100),
    };
    const content = await this.reportsService.getTopRiskZonesExcel(filters);

    await this.reportsService.saveGeneratedReport({
      title: 'Top zones exposées',
      reportType: 'TOP_RISK_ZONES',
      format: 'XLSX',
      fileName,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content,
      filters,
    });

    return this.sendXlsx(res, fileName, content);
  }

  @Get('top-risk-zones.pdf')
  @Roles('ADMIN', 'ANALYSTE')
  async topRiskZonesPdf(
    @Res() res: Response,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('limit') limit?: string,
  ) {
    const fileName = 'top-risk-zones.pdf';
    const filters = {
      riskType,
      zoneType,
      limit: Number(limit ?? 50),
    };
    const content = await this.reportsService.getTopRiskZonesPdf(filters);

    await this.reportsService.saveGeneratedReport({
      title: 'Top zones exposées',
      reportType: 'TOP_RISK_ZONES',
      format: 'PDF',
      fileName,
      mimeType: 'application/pdf',
      content,
      filters,
    });

    return this.sendPdf(res, fileName, content);
  }

  @Get('data-sources.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async dataSourcesCsv(@Res() res: Response) {
    const fileName = 'data-sources.csv';
    const content = await this.reportsService.getDataSourcesCsv();

    await this.reportsService.saveGeneratedReport({
      title: 'Sources de données',
      reportType: 'DATA_SOURCES',
      format: 'CSV',
      fileName,
      mimeType: 'text/csv',
      content: '\uFEFF' + content,
    });

    return this.sendCsv(res, fileName, content);
  }

  @Get('data-sources.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async dataSourcesExcel(@Res() res: Response) {
    const fileName = 'data-sources.xlsx';
    const content = await this.reportsService.getDataSourcesExcel();

    await this.reportsService.saveGeneratedReport({
      title: 'Sources de données',
      reportType: 'DATA_SOURCES',
      format: 'XLSX',
      fileName,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content,
    });

    return this.sendXlsx(res, fileName, content);
  }

  @Get('etl-jobs.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async etlJobsCsv(@Res() res: Response) {
    const fileName = 'etl-jobs.csv';
    const content = await this.reportsService.getEtlJobsCsv();

    await this.reportsService.saveGeneratedReport({
      title: 'Jobs ETL récents',
      reportType: 'ETL_JOBS',
      format: 'CSV',
      fileName,
      mimeType: 'text/csv',
      content: '\uFEFF' + content,
    });

    return this.sendCsv(res, fileName, content);
  }

  @Get('etl-jobs.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async etlJobsExcel(@Res() res: Response) {
    const fileName = 'etl-jobs.xlsx';
    const content = await this.reportsService.getEtlJobsExcel();

    await this.reportsService.saveGeneratedReport({
      title: 'Jobs ETL récents',
      reportType: 'ETL_JOBS',
      format: 'XLSX',
      fileName,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content,
    });

    return this.sendXlsx(res, fileName, content);
  }
}
