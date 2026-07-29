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

  /**
   * Compatibilité avec l'ancien endpoint risque global.
   */
  @Get('latest/risk')
  findLatestRisk() {
    return this.rastersService.findLatestRisk();
  }

  /**
   * Compatibilité avec l'ancien endpoint fichier risque global.
   */
  @Get('latest/risk/file')
  async getLatestRiskFile(@Res() res: Response) {
    const layer = await this.rastersService.findLatestRisk();
    return this.sendRasterFile(layer.filePath, res, 'risk_index.tif');
  }

  /**
   * Endpoint générique :
   * /api/rasters/latest/RISK_INDEX
   * /api/rasters/latest/FLOOD_RISK_INDEX
   */
  @Get('latest/:type')
  findLatestByType(@Param('type') type: RasterLayerType) {
    return this.rastersService.findLatestByType(type);
  }

  /**
   * Endpoint générique fichier :
   * /api/rasters/latest/RISK_INDEX/file
   * /api/rasters/latest/FLOOD_RISK_INDEX/file
   */
  @Get('latest/:type/file')
  async getLatestFileByType(
    @Param('type') type: RasterLayerType,
    @Res() res: Response,
  ) {
    const layer = await this.rastersService.findLatestByType(type);
    return this.sendRasterFile(layer.filePath, res, `${type}.tif`);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rastersService.findOne(id);
  }

  private sendRasterFile(filePath: string, res: Response, filename: string) {
    const projectRoot = resolve(process.cwd(), '..');
    const absolutePath = join(projectRoot, filePath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException(
        `Fichier raster introuvable : ${filePath}`,
      );
    }

    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`,
    );

    return res.sendFile(absolutePath);
  }
}
