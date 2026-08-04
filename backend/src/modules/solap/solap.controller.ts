import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SolapService } from './solap.service';

@Controller('solap')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolapController {
  constructor(private readonly solapService: SolapService) {}

  @Get('risk-cube')
  @Roles('ADMIN', 'ANALYSTE', 'OBSERVATEUR')
  getRiskCube(
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
  ) {
    return this.solapService.getRiskCube({
      riskType,
      zoneType,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('risk-summary')
  @Roles('ADMIN', 'ANALYSTE', 'OBSERVATEUR')
  getRiskSummary(
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.solapService.getRiskSummary({
      riskType,
      zoneType,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  @Get('risk-drilldown')
  @Roles('ADMIN', 'ANALYSTE', 'OBSERVATEUR')
  getRiskDrilldown(
    @Query('riskType') riskType?: string,
    @Query('fromLevel') fromLevel?: string,
    @Query('zoneId') zoneId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.solapService.getRiskDrilldown({
      riskType,
      fromLevel,
      zoneId,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  @Get('risk-timeseries')
  @Roles('ADMIN', 'ANALYSTE', 'OBSERVATEUR')
  getRiskTimeSeries(
    @Query('riskType') riskType?: string,
    @Query('zoneType') zoneType?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.solapService.getRiskTimeSeries({
      riskType,
      zoneType,
      zoneId,
    });
  }
}
