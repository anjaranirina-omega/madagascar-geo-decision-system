import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { GeographieService } from './geographie.service';

@Controller('geographie')
export class GeographieController {
  constructor(private readonly geographieService: GeographieService) {}

  @Get('regions')
  findAllRegions() {
    return this.geographieService.findAllRegions();
  }

  @Get('regions/geojson')
  findRegionsGeoJson() {
    return this.geographieService.findRegionsGeoJson();
  }

  @Get('districts')
  findAllDistricts(@Query('regionId') regionId?: string) {
    return this.geographieService.findAllDistricts(regionId);
  }

  @Get('districts/geojson')
  findDistrictsGeoJson() {
    return this.geographieService.findDistrictsGeoJson();
  }

  @Get('communes')
  findAllCommunes(@Query('districtId') districtId?: string) {
    return this.geographieService.findAllCommunes(districtId);
  }

  @Get('communes/geojson')
  findCommunesGeoJson() {
    return this.geographieService.findCommunesGeoJson();
  }

  @Get('locate')
  locatePoint(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Latitude ou longitude invalide');
    }

    return this.geographieService.locatePoint(latitude, longitude);
  }

  @Get('summary')
  getZoneSummary(@Query('type') type: string, @Query('id') id: string) {
    if (!type || !id) {
      throw new BadRequestException('type et id sont obligatoires');
    }

    return this.geographieService.getZoneSummary(type, id);
  }

  @Get('regions/:id')
  findRegionById(@Param('id') id: string) {
    return this.geographieService.findRegionById(id);
  }

  @Get('districts/:id')
  findDistrictById(@Param('id') id: string) {
    return this.geographieService.findDistrictById(id);
  }

  @Get('communes/:id')
  findCommuneById(@Param('id') id: string) {
    return this.geographieService.findCommuneById(id);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.geographieService.search(q);
  }
}
