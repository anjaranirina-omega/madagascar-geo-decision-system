import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ZoneType } from '../zone-indicators/entities/zone-indicator.entity';
import { ClimateService } from './climate.service';
import { ClimateSyncService } from './climate-sync.service';
import { ClimateDataSource } from './entities/climate-observation.entity';

@Controller('climate')
export class ClimateController {
  constructor(
    private readonly climateService: ClimateService,
    private readonly climateSyncService: ClimateSyncService,
  ) {}

  @Get('observations')
  findAll(
    @Query('source') source?: ClimateDataSource,
    @Query('zoneType') zoneType?: ZoneType,
    @Query('zoneId') zoneId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.climateService.findAll({
      source,
      zoneType,
      zoneId,
      startDate,
      endDate,
      limit: Number(limit ?? 200),
    });
  }

  @Get('latest')
  latest(
    @Query('source') source: ClimateDataSource = ClimateDataSource.NASA_POWER,
    @Query('zoneType') zoneType?: ZoneType,
  ) {
    return this.climateService.latest(source, zoneType);
  }

  @Get('summary')
  summary(
    @Query('source') source: ClimateDataSource = ClimateDataSource.NASA_POWER,
  ) {
    return this.climateService.summary(source);
  }

  @Post('sync-nasa-power')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  syncNasaPower() {
    return this.climateSyncService.syncNasaPowerRegions();
  }
}
