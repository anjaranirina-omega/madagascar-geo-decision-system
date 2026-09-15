import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
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
  @UseGuards(JwtAuthGuard)
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

  /**
   * Poids format objet pour scripts de calcul de risque (ETL/M2M et utilisateur).
   */
  @UseGuards(ApiKeyOrJwtGuard)
  @Get('criteria-weights/object')
  getWeightsAsObject() {
    return this.risquesService.getWeightsAsObject();
  }

  /**
   * Poids dynamiques des modèles spécifiques :
   * FLOOD, DROUGHT, LANDSLIDE, CYCLONE.
   */
  @UseGuards(JwtAuthGuard)
  @Get('model-weights')
  findRiskModelWeights() {
    return this.risquesService.findRiskModelWeights();
  }

  @UseGuards(JwtAuthGuard)
  @Get('model-weights/:riskType')
  findRiskModelWeightsByType(@Param('riskType') riskType: SpecificRiskType) {
    return this.risquesService.findRiskModelWeights(riskType);
  }

  /**
   * Poids spécifiques format objet pour scripts de calcul de risque (ETL/M2M et utilisateur).
   */
  @UseGuards(ApiKeyOrJwtGuard)
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
   * Recalculs de modèles et rasters de risque.
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
