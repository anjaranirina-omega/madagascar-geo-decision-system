import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { MeteoService } from './meteo.service';

@Controller('meteo')
export class MeteoController {
  constructor(private readonly meteoService: MeteoService) {}

  @Get('current')
  getCurrentWeather(@Query() query: WeatherQueryDto) {
    return this.meteoService.getCurrentWeather(query.lat, query.lng);
  }

  @Get('latest')
  findLatest(@Query('limit') limit?: string) {
    return this.meteoService.findLatest(Number(limit ?? 20));
  }

  @Get('latest-by-zone')
  findLatestByZone(@Query('zoneType') zoneType?: string) {
    return this.meteoService.findLatestByZone(zoneType ?? 'region');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('sync-regions')
  syncRegionsWeather() {
    return this.meteoService.syncRegionsWeather();
  }
}
