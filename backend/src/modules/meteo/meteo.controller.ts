import { Controller, Get, Query } from '@nestjs/common';
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
}
