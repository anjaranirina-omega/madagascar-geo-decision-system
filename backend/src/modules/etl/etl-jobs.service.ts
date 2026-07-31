import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtlService } from './etl.service';
import {
  EtlPipelineJob,
  EtlPipelineJobStatus,
  EtlPipelineJobType,
} from './entities/etl-pipeline-job.entity';

@Injectable()
export class EtlJobsService {
  private readonly logger = new Logger(EtlJobsService.name);
  private runningRiskPipeline = false;

  constructor(
    @InjectRepository(EtlPipelineJob)
    private readonly jobsRepository: Repository<EtlPipelineJob>,
    private readonly etlService: EtlService,
  ) {}

  async startRiskPipeline() {
    const job = await this.jobsRepository.save(
      this.jobsRepository.create({
        type: EtlPipelineJobType.RISK_PIPELINE,
        status: EtlPipelineJobStatus.PENDING,
        message: 'Pipeline de risque en attente de démarrage.',
        steps: [],
      }),
    );

    setImmediate(() => {
      void this.runRiskPipelineJob(job.id);
    });

    return job;
  }

  async findJob(id: string) {
    const job = await this.jobsRepository.findOne({
      where: {
        id,
      },
    });

    if (!job) {
      throw new NotFoundException('Job ETL introuvable.');
    }

    return job;
  }

  async findLatest(limit = 20) {
    return this.jobsRepository.find({
      order: {
        createdAt: 'DESC',
      },
      take: Math.min(Math.max(Number(limit) || 20, 1), 100),
    });
  }

  private async runRiskPipelineJob(jobId: string) {
    const startedAt = Date.now();

    if (this.runningRiskPipeline) {
      await this.jobsRepository.update(jobId, {
        status: EtlPipelineJobStatus.FAILED,
        message: 'Un pipeline de risque est déjà en cours.',
        error: 'Pipeline déjà en cours.',
        finishedAt: new Date(),
        durationMs: 0,
      });

      return;
    }

    this.runningRiskPipeline = true;

    await this.jobsRepository.update(jobId, {
      status: EtlPipelineJobStatus.RUNNING,
      message: 'Pipeline de risque en cours.',
      startedAt: new Date(),
      error: null,
    });

    this.logger.log(`Démarrage job ETL risk pipeline : ${jobId}`);

    try {
      const result = await this.etlService.runRiskPipeline();

      const durationMs = Date.now() - startedAt;

      await this.jobsRepository.update(jobId, {
        status: EtlPipelineJobStatus.SUCCESS,
        message: result.message,
        steps: result.steps ?? [],
        alertWarning: result.alertWarning ?? null,
        finishedAt: new Date(),
        durationMs,
      });

      this.logger.log(`Job ETL terminé avec succès : ${jobId}`);
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      const response =
        typeof (error as { getResponse?: () => unknown }).getResponse ===
        'function'
          ? (error as { getResponse: () => unknown }).getResponse()
          : null;

      const responseObject =
        response && typeof response === 'object'
          ? (response as Record<string, unknown>)
          : null;

      const message =
        responseObject?.message ??
        (error instanceof Error ? error.message : String(error));

      const steps = Array.isArray(responseObject?.results)
        ? responseObject.results
        : [];

      await this.jobsRepository.update(jobId, {
        status: EtlPipelineJobStatus.FAILED,
        message: 'Pipeline de risque échoué.',
        steps,
        error: String(message),
        finishedAt: new Date(),
        durationMs,
      });

      this.logger.error(
        `Job ETL échoué : ${jobId}`,
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.runningRiskPipeline = false;
    }
  }
}
