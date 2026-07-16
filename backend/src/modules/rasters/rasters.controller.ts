import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRasterLayerDto } from './dto/create-raster-layer.dto';
import { RasterLayerType } from './entities/raster-layer.entity';
import { RastersService } from './rasters.service';

@Controller('rasters')
export class RastersController {
  constructor(private readonly rastersService: RastersService) {}

  @Post('register')
  register(@Body() dto: CreateRasterLayerDto) {
    return this.rastersService.register(dto);
  }

  @Get()
  findAll(@Query('type') type?: RasterLayerType) {
    return this.rastersService.findAll(type);
  }

  @Get('latest/risk')
  findLatestRisk() {
    return this.rastersService.findLatestRisk();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rastersService.findOne(id);
  }
}
