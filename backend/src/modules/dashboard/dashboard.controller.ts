import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('health')
  health() {
    return { module: 'dashboard', status: 'ok' };
  }

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('top-risk-zones')
  getTopRiskZones(
    @Query('limit') limit?: string,
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
  ) {
    return this.dashboardService.getTopRiskZones(
      Number(limit ?? 10),
      riskType,
      zoneType ?? 'region',
    );
  }

  @Get('risk-distribution')
  getRiskDistribution(
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
  ) {
    return this.dashboardService.getRiskDistribution(
      riskType,
      zoneType ?? 'region',
    );
  }

  @Get('risk-by-region')
  getRiskByRegion() {
    return this.dashboardService.getRiskByRegion();
  }

  @Get('data-sources')
  getDataSources() {
    return this.dashboardService.getDataSources();
  }

  @Get('etl-jobs')
  getLatestEtlJobs(@Query('limit') limit?: string) {
    return this.dashboardService.getLatestEtlJobs(Number(limit ?? 5));
  }

  @Get('rasters')
  getRasterSummary() {
    return this.dashboardService.getRasterSummary();
  }

  @Get('climate-indicators')
  getClimateIndicators() {
    return this.dashboardService.getClimateIndicators();
  }
}
