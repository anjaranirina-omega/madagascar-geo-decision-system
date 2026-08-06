import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateCriteriaWeightsDto } from './dto/update-criteria-weights.dto';
import { UpdateRiskModelWeightsDto } from './dto/update-risk-model-weights.dto';
import { SpecificRiskType } from './entities/risk-model-weight.entity';
import { RisquesService } from './risques.service';

@Controller('risques')
export class RisquesController {
  constructor(private readonly risquesService: RisquesService) {}

  /**
   * Poids dynamiques du risque global.
   */
  @Get('criteria-weights')
  findWeights() {
    return this.risquesService.findWeights();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Put('criteria-weights')
  updateWeights(@Body() dto: UpdateCriteriaWeightsDto) {
    return this.risquesService.updateWeights(dto);
  }

  @Get('criteria-weights/object')
  getWeightsAsObject() {
    return this.risquesService.getWeightsAsObject();
  }

  /**
   * Poids dynamiques des modèles spécifiques :
   * FLOOD, DROUGHT, LANDSLIDE, CYCLONE.
   */
  @Get('model-weights')
  findRiskModelWeights() {
    return this.risquesService.findRiskModelWeights();
  }

  @Get('model-weights/:riskType')
  findRiskModelWeightsByType(@Param('riskType') riskType: SpecificRiskType) {
    return this.risquesService.findRiskModelWeights(riskType);
  }

  @Get('model-weights/:riskType/object')
  getRiskModelWeightsObject(@Param('riskType') riskType: SpecificRiskType) {
    return this.risquesService.getRiskModelWeightsObject(riskType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Put('model-weights/:riskType')
  updateRiskModelWeights(
    @Param('riskType') riskType: SpecificRiskType,
    @Body() dto: UpdateRiskModelWeightsDto,
  ) {
    return this.risquesService.updateRiskModelWeights({
      ...dto,
      riskType,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('model-weights/reset-defaults')
  resetRiskModelWeights() {
    return this.risquesService.resetRiskModelWeights();
  }

  /**
   * Recalculs existants.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('recalculate-raster')
  recalculateRasterRisk() {
    return this.risquesService.recalculateRasterRisk();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('sync-chirps-latest')
  syncLatestChirps() {
    return this.risquesService.syncLatestChirpsAndRecalculate();
  }
}
