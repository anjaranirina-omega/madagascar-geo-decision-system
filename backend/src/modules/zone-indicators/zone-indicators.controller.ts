import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UpsertZoneIndicatorDto } from './dto/upsert-zone-indicator.dto';
import { UpsertZoneRiskIndicatorDto } from './dto/upsert-zone-risk-indicator.dto';
import { ZoneType } from './entities/zone-indicator.entity';
import { RiskType } from './entities/zone-risk-indicator.entity';
import { ZoneIndicatorsService } from './zone-indicators.service';

@Controller('zone-indicators')
export class ZoneIndicatorsController {
  constructor(private readonly zoneIndicatorsService: ZoneIndicatorsService) {}

  @Post('upsert')
  upsert(@Body() dto: UpsertZoneIndicatorDto) {
    return this.zoneIndicatorsService.upsert(dto);
  }

  @Post('risk/upsert')
  upsertRiskIndicator(@Body() dto: UpsertZoneRiskIndicatorDto) {
    return this.zoneIndicatorsService.upsertRiskIndicator(dto);
  }

  @Get('by-risk/:riskType/summary')
  getRiskSummary(
    @Param('riskType') riskType: RiskType,
    @Query('zoneType') zoneType?: ZoneType,
  ) {
    return this.zoneIndicatorsService.getRiskSummary(riskType, zoneType);
  }

  @Get('by-risk/:riskType/top')
  findTopByRisk(
    @Param('riskType') riskType: RiskType,
    @Query('zoneType') zoneType?: ZoneType,
    @Query('limit') limit?: string,
  ) {
    return this.zoneIndicatorsService.findTopByRisk(
      riskType,
      zoneType,
      Number(limit ?? 10),
    );
  }

  @Get('by-risk/:riskType')
  findByRisk(
    @Param('riskType') riskType: RiskType,
    @Query('zoneType') zoneType?: ZoneType,
  ) {
    return this.zoneIndicatorsService.findByRisk(riskType, zoneType);
  }

  @Get()
  findAll(@Query('zoneType') zoneType?: ZoneType) {
    return this.zoneIndicatorsService.findAll(zoneType);
  }

  @Get(':zoneType/:zoneId')
  findOne(
    @Param('zoneType') zoneType: ZoneType,
    @Param('zoneId') zoneId: string,
  ) {
    return this.zoneIndicatorsService.findOne(zoneType, zoneId);
  }
}
