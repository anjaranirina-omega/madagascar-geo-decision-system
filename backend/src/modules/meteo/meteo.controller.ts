import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SyncActiveCyclonesDto } from './dto/sync-active-cyclones.dto';
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

  /**
   * Endpoint de synchronisation ETL des cyclones actifs (GDACS).
   * Utilisé par etl/raster/risks/cyclone/fetch_active_cyclones.py.
   */
  @Post('active-cyclones/sync')
  syncActiveCyclones(@Body() dto: SyncActiveCyclonesDto) {
    return this.meteoService.syncActiveCyclones(dto);
  }

  /**
   * Endpoint de consultation des cyclones actifs pour le frontend/SIG.
   */
  @Get('active-cyclones')
  findActiveCyclones(@Query('all') all?: string) {
    return this.meteoService.findActiveCyclones(all === 'true');
  }

  /**
   * Détail d'un cyclone actif avec géométrie complète de trajectoire.
   */
  @Get('active-cyclones/:id')
  findActiveCycloneById(@Param('id') id: string) {
    return this.meteoService.findActiveCycloneById(id);
  }
}

