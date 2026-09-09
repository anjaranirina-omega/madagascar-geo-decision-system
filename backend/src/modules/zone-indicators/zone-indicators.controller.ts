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
import { UpsertZoneIndicatorDto } from './dto/upsert-zone-indicator.dto';
import { UpsertZoneRiskIndicatorDto } from './dto/upsert-zone-risk-indicator.dto';
import { ZoneType } from './entities/zone-indicator.entity';
import { RiskType } from './entities/zone-risk-indicator.entity';
import { ZoneIndicatorsService } from './zone-indicators.service';

@Controller('zone-indicators')
export class ZoneIndicatorsController {
  constructor(private readonly zoneIndicatorsService: ZoneIndicatorsService) {}

  /**
   * Enregistrement ou mise à jour d'indicateurs de zone.
   * Réservé aux administrateurs et analystes (utilisé par les pipelines ETL).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('upsert')
  upsert(@Body() dto: UpsertZoneIndicatorDto) {
    return this.zoneIndicatorsService.upsert(dto);
  }

  /**
   * Enregistrement ou mise à jour d'indicateurs de risque spécifique.
   * Réservé aux administrateurs et analystes (utilisé par les pipelines ETL).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('risk/upsert')
  upsertRiskIndicator(@Body() dto: UpsertZoneRiskIndicatorDto) {
    return this.zoneIndicatorsService.upsertRiskIndicator(dto);
  }

  /**
   * Synthèse des indicateurs de risque par type d'aléa.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get('by-risk/:riskType/summary')
  getRiskSummary(
    @Param('riskType') riskType: RiskType,
    @Query('zoneType') zoneType?: ZoneType,
  ) {
    return this.zoneIndicatorsService.getRiskSummary(riskType, zoneType);
  }

  /**
   * Classement des zones les plus à risque.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get('by-risk/:riskType/top')
  findTopByRisk(
    @Param('riskType') riskType: RiskType,
    @Query('zoneType') zoneType?: ZoneType,
    @Query('limit') limit?: string,
  ) {
    return this.zoneIndicatorsService.findTopByRisk(
      riskType,
      zoneType,
      Number(limit ?? 10),
    );
  }

  /**
   * Consultation des indicateurs par type de risque.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get('by-risk/:riskType')
  findByRisk(
    @Param('riskType') riskType: RiskType,
    @Query('zoneType') zoneType?: ZoneType,
  ) {
    return this.zoneIndicatorsService.findByRisk(riskType, zoneType);
  }

  /**
   * Consultation de l'ensemble des indicateurs territoriaux.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('zoneType') zoneType?: ZoneType) {
    return this.zoneIndicatorsService.findAll(zoneType);
  }

  /**
   * Consultation de l'indicateur d'une zone précise par type et ID.
   * Accessible à tout utilisateur authentifié.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':zoneType/:zoneId')
  findOne(
    @Param('zoneType') zoneType: ZoneType,
    @Param('zoneId') zoneId: string,
  ) {
    return this.zoneIndicatorsService.findOne(zoneType, zoneId);
  }
}
