import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EtlJobsService } from './etl-jobs.service';
import { EtlService } from './etl.service';

@Controller('etl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EtlController {
  constructor(
    private readonly etlService: EtlService,
    private readonly etlJobsService: EtlJobsService,
  ) {}

  /**
   * Ancien mode synchrone.
   * Conservé pour compatibilité, mais le frontend doit utiliser /start.
   */
  @Post('risk-pipeline/run')
  @Roles('ADMIN', 'ANALYSTE')
  runRiskPipeline() {
    return this.etlService.runRiskPipeline();
  }

  /**
   * Nouveau mode asynchrone.
   * Retourne immédiatement un jobId.
   */
  @Post('risk-pipeline/start')
  @Roles('ADMIN', 'ANALYSTE')
  startRiskPipeline() {
    return this.etlJobsService.startRiskPipeline();
  }

  @Get('risk-pipeline/jobs')
  @Roles('ADMIN', 'ANALYSTE')
  findLatestJobs(@Query('limit') limit?: string) {
    return this.etlJobsService.findLatest(Number(limit ?? 20));
  }

  @Get('risk-pipeline/jobs/:id')
  @Roles('ADMIN', 'ANALYSTE')
  findJob(@Param('id') id: string) {
    return this.etlJobsService.findJob(id);
  }
}
