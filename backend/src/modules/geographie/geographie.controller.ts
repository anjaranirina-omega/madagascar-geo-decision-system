import { Controller, Get, Param, Query } from '@nestjs/common';
import { GeographieService } from './geographie.service';

@Controller('geographie')
export class GeographieController {
  constructor(private readonly geographieService: GeographieService) {}

  @Get('regions')
  findAllRegions() {
    return this.geographieService.findAllRegions();
  }

  @Get('regions/:id')
  findRegionById(@Param('id') id: string) {
    return this.geographieService.findRegionById(id);
  }

  @Get('districts')
  findAllDistricts(@Query('regionId') regionId?: string) {
    return this.geographieService.findAllDistricts(regionId);
  }

  @Get('districts/:id')
  findDistrictById(@Param('id') id: string) {
    return this.geographieService.findDistrictById(id);
  }

  @Get('communes')
  findAllCommunes(@Query('districtId') districtId?: string) {
    return this.geographieService.findAllCommunes(districtId);
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
