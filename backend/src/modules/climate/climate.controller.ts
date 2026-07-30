import { Controller, Get, Query } from '@nestjs/common';
import { ZoneType } from '../zone-indicators/entities/zone-indicator.entity';
import { ClimateService } from './climate.service';
import { ClimateDataSource } from './entities/climate-observation.entity';

@Controller('climate')
export class ClimateController {
  constructor(private readonly climateService: ClimateService) {}

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
}
