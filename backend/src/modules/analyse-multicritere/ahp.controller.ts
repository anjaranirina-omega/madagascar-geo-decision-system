import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyseMulticritereService } from './ahp.service';
import { AhpCalculateDto } from './dto/ahp-calculate.dto';

@UseGuards(JwtAuthGuard)
@Controller('ahp')
export class AnalyseMulticritereController {
  constructor(private readonly ahpService: AnalyseMulticritereService) {}

  /**
   * Diagnostic de santé du module AHP et connectivité avec le microservice Python.
   */
  @Get('health')
  health() {
    return this.ahpService.health();
  }

  /**
   * Liste des critères standard disponibles pour la modélisation spatiale.
   */
  @Get('criteria')
  getCriteria() {
    return this.ahpService.getCriteria();
  }

  /**
   * Calcul matriciel AHP de Saaty (Vecteur de priorité, Lambda max, CI, CR et Indice de risque).
   */
  @Post('calculate')
  calculate(@Body() dto: AhpCalculateDto) {
    return this.ahpService.calculate(dto);
  }
}
