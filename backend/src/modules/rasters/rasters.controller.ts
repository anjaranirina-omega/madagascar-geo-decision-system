import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRasterLayerDto } from './dto/create-raster-layer.dto';
import { RasterLayerType } from './entities/raster-layer.entity';
import { RastersService } from './rasters.service';

@Controller('rasters')
export class RastersController {
  constructor(private readonly rastersService: RastersService) {}

  private getProjectRoot(): string {
    const cwd = process.cwd();
    if (cwd.endsWith('backend')) {
      return resolve(cwd, '..');
    }
    return cwd;
  }

  /**
   * Enregistrement de métadonnées raster.
   * Réservé aux administrateurs et analystes (utilisé par l'ETL).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('register')
  register(@Body() dto: CreateRasterLayerDto) {
    return this.rastersService.register(dto);
  }

  /**
   * Consultation de la liste des rasters.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('type') type?: RasterLayerType,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.rastersService.findAll(type, activeOnly === 'true');
  }

  /**
   * Compatibilité avec l'ancien endpoint risque global.
   */
  @UseGuards(JwtAuthGuard)
  @Get('latest/risk')
  findLatestRisk() {
    return this.rastersService.findLatestRisk();
  }

  /**
   * Compatibilité avec l'ancien endpoint fichier risque global.
   */
  @UseGuards(JwtAuthGuard)
  @Get('latest/risk/file')
  async getLatestRiskFile(@Res() res: Response) {
    const layer = await this.rastersService.findLatestRisk();
    return this.sendRasterFile(layer.filePath, res, 'risk_index.tif');
  }

  /**
   * Endpoint générique métadonnées récentes par type.
   */
  @UseGuards(JwtAuthGuard)
  @Get('latest/:type')
  findLatestByType(@Param('type') type: RasterLayerType) {
    return this.rastersService.findLatestByType(type);
  }

  /**
   * Endpoint générique fichier raster par type.
   */
  @UseGuards(JwtAuthGuard)
  @Get('latest/:type/file')
  async getLatestFileByType(
    @Param('type') type: RasterLayerType,
    @Res() res: Response,
  ) {
    const layer = await this.rastersService.findLatestByType(type);
    return this.sendRasterFile(layer.filePath, res, `${type}.tif`);
  }

  /**
   * Téléchargement/affichage du fichier raster par ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/file')
  async getFileById(@Param('id') id: string, @Res() res: Response) {
    const layer = await this.rastersService.findOne(id);
    return this.sendRasterFile(layer.filePath, res, `${layer.type}.tif`);
  }

  /**
   * Consultation du détail d'un raster par ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rastersService.findOne(id);
  }

  /**
   * Envoi sécurisé du fichier raster avec protection contre le Path Traversal.
   */
  private sendRasterFile(filePath: string, res: Response, filename: string) {
    const projectRoot = this.getProjectRoot();
    const allowedRasterDir = resolve(projectRoot, 'etl', 'data', 'raster');
    const resolvedPath = resolve(projectRoot, filePath);

    // Validation stricte : le chemin résolu doit impérativement se situer
    // à l'intérieur du répertoire autorisé 'etl/data/raster'
    if (
      !resolvedPath.startsWith(allowedRasterDir + '/') &&
      resolvedPath !== allowedRasterDir
    ) {
      throw new ForbiddenException(
        'Accès refusé : le fichier raster demandé est en dehors du répertoire autorisé.',
      );
    }

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException(
        `Fichier raster introuvable : ${filePath}`,
      );
    }

    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`,
    );

    return res.sendFile(resolvedPath);
  }
}
