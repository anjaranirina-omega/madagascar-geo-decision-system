import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
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

  @Get('latest/risk/file')
  async getLatestRiskFile(@Res() res: Response) {
    const layer = await this.rastersService.findLatestRisk();

    /**
     * layer.filePath est enregistré sous forme relative, par exemple :
     * etl/data/raster/risk/risk_index.tif
     *
     * process.cwd() est généralement :
     * backend/
     *
     * donc le root projet est :
     * backend/..
     */
    const projectRoot = resolve(process.cwd(), '..');
    const absolutePath = join(projectRoot, layer.filePath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException(
        `Fichier raster introuvable : ${layer.filePath}`,
      );
    }

    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="risk_index.tif"',
    );

    return res.sendFile(absolutePath);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rastersService.findOne(id);
  }
}
