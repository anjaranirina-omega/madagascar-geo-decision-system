import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateCommuneDto } from './dto/create-commune.dto';
import { CreateDistrictDto } from './dto/create-district.dto';
import { CreateRegionDto } from './dto/create-region.dto';
import { GeographieService } from './geographie.service';

@Controller('geographie')
export class GeographieController {
  constructor(private readonly geographieService: GeographieService) {}

  @Post('regions')
  createRegion(@Body() dto: CreateRegionDto) {
    return this.geographieService.createRegion(dto);
  }

  @Post('districts')
  createDistrict(@Body() dto: CreateDistrictDto) {
    return this.geographieService.createDistrict(dto);
  }

  @Post('communes')
  createCommune(@Body() dto: CreateCommuneDto) {
    return this.geographieService.createCommune(dto);
  }

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
