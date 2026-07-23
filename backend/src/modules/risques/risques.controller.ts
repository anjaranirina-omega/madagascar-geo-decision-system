import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateCriteriaWeightsDto } from './dto/update-criteria-weights.dto';
import { RisquesService } from './risques.service';

@Controller('risques')
export class RisquesController {
  constructor(private readonly risquesService: RisquesService) {}

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ANALYSTE')
  @Post('recalculate-raster')
  recalculateRasterRisk() {
    return this.risquesService.recalculateRasterRisk();
  }
}
