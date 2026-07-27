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
  getTopRiskZones(@Query('limit') limit?: string) {
    return this.dashboardService.getTopRiskZones(Number(limit ?? 5));
  }

  @Get('risk-distribution')
  getRiskDistribution() {
    return this.dashboardService.getRiskDistribution();
  }

  @Get('alerts-summary')
  getAlertsSummary() {
    return this.dashboardService.getAlertsSummary();
  }

  @Get('climate-indicators')
  getClimateIndicators() {
    return this.dashboardService.getClimateIndicators();
  }
}
