import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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

  @Get('national-risk.pdf')
  @Roles('ADMIN', 'ANALYSTE')
  async nationalRiskPdf(@Res() res: Response) {
    const content = await this.reportsService.getNationalRiskPdf();

    return this.sendPdf(res, 'riskclim-mg-rapport-national.pdf', content);
  }

  @Get('national-risk.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async nationalRiskExcel(@Res() res: Response) {
    const content = await this.reportsService.getNationalRiskExcel();

    return this.sendXlsx(res, 'riskclim-mg-rapport-national.xlsx', content);
  }

  @Get('risk-summary.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async riskSummaryCsv(@Res() res: Response) {
    const content = await this.reportsService.getRiskSummaryCsv();

    return this.sendCsv(res, 'risk-summary.csv', content);
  }

  @Get('top-risk-zones.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async topRiskZonesCsv(
    @Res() res: Response,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('limit') limit?: string,
  ) {
    const content = await this.reportsService.getTopRiskZonesCsv({
      riskType,
      zoneType,
      limit: Number(limit ?? 100),
    });

    return this.sendCsv(res, 'top-risk-zones.csv', content);
  }

  @Get('top-risk-zones.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async topRiskZonesExcel(
    @Res() res: Response,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('limit') limit?: string,
  ) {
    const content = await this.reportsService.getTopRiskZonesExcel({
      riskType,
      zoneType,
      limit: Number(limit ?? 100),
    });

    return this.sendXlsx(res, 'top-risk-zones.xlsx', content);
  }

  @Get('top-risk-zones.pdf')
  @Roles('ADMIN', 'ANALYSTE')
  async topRiskZonesPdf(
    @Res() res: Response,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('limit') limit?: string,
  ) {
    const content = await this.reportsService.getTopRiskZonesPdf({
      riskType,
      zoneType,
      limit: Number(limit ?? 50),
    });

    return this.sendPdf(res, 'top-risk-zones.pdf', content);
  }

  @Get('data-sources.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async dataSourcesCsv(@Res() res: Response) {
    const content = await this.reportsService.getDataSourcesCsv();

    return this.sendCsv(res, 'data-sources.csv', content);
  }

  @Get('data-sources.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async dataSourcesExcel(@Res() res: Response) {
    const content = await this.reportsService.getDataSourcesExcel();

    return this.sendXlsx(res, 'data-sources.xlsx', content);
  }

  @Get('etl-jobs.csv')
  @Roles('ADMIN', 'ANALYSTE')
  async etlJobsCsv(@Res() res: Response) {
    const content = await this.reportsService.getEtlJobsCsv();

    return this.sendCsv(res, 'etl-jobs.csv', content);
  }

  @Get('etl-jobs.xlsx')
  @Roles('ADMIN', 'ANALYSTE')
  async etlJobsExcel(@Res() res: Response) {
    const content = await this.reportsService.getEtlJobsExcel();

    return this.sendXlsx(res, 'etl-jobs.xlsx', content);
  }
}
