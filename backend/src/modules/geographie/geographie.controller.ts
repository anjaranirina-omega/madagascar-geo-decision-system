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

  @Get('regions/:id')
  findRegionById(@Param('id') id: string) {
    return this.geographieService.findRegionById(id);
  }

  @Get('districts')
  findAllDistricts(@Query('regionId') regionId?: string) {
    return this.geographieService.findAllDistricts(regionId);
  }

  @Get('districts/geojson')
  findDistrictsGeoJson() {
    return this.geographieService.findDistrictsGeoJson();
  }

  @Get('districts/:id')
  findDistrictById(@Param('id') id: string) {
    return this.geographieService.findDistrictById(id);
  }

  @Get('communes')
  findAllCommunes(@Query('districtId') districtId?: string) {
    return this.geographieService.findAllCommunes(districtId);
  }

  @Get('communes/geojson')
  findCommunesGeoJson() {
    return this.geographieService.findCommunesGeoJson();
  }

  @Get('communes/:id')
  findCommuneById(@Param('id') id: string) {
    return this.geographieService.findCommuneById(id);
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

  @Get('search')
  search(@Query('q') q: string) {
    return this.geographieService.search(q);
  }
}
