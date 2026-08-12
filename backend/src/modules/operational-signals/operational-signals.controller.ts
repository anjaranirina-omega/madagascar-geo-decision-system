import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperationalRiskType,
} from './entities/operational-risk-signal.entity';
import { OperationalSignalsService } from './operational-signals.service';

@Controller('operational-signals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationalSignalsController {
  constructor(
    private readonly operationalSignalsService: OperationalSignalsService,
  ) {}

  @Post('recompute')
  @Roles('ADMIN', 'ANALYSTE')
  recompute(@Query('zoneType') zoneType?: string) {
    return this.operationalSignalsService.recompute(zoneType ?? 'region');
  }

  @Get()
  @Roles('ADMIN', 'ANALYSTE', 'DECIDEUR', 'AGENT_TERRAIN')
  findAll(
    @Query('riskType') riskType?: OperationalRiskType,
    @Query('zoneType') zoneType?: string,
  ) {
    return this.operationalSignalsService.findAll({
      riskType,
      zoneType,
    });
  }

  @Get('critical')
  @Roles('ADMIN', 'ANALYSTE', 'DECIDEUR', 'AGENT_TERRAIN')
  findLatestCritical() {
    return this.operationalSignalsService.findLatestCritical();
  }
}
