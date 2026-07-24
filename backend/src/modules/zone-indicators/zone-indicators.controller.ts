import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UpsertZoneIndicatorDto } from './dto/upsert-zone-indicator.dto';
import { ZoneType } from './entities/zone-indicator.entity';
import { ZoneIndicatorsService } from './zone-indicators.service';

@Controller('zone-indicators')
export class ZoneIndicatorsController {
  constructor(
    private readonly zoneIndicatorsService: ZoneIndicatorsService,
  ) {}

  @Post('upsert')
  upsert(@Body() dto: UpsertZoneIndicatorDto) {
    return this.zoneIndicatorsService.upsert(dto);
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
