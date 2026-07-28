import { Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EtlService } from './etl.service';

@Controller('etl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EtlController {
  constructor(private readonly etlService: EtlService) {}

  @Post('risk-pipeline/run')
  @Roles('ADMIN', 'ANALYSTE')
  runRiskPipeline() {
    return this.etlService.runRiskPipeline();
  }
}
