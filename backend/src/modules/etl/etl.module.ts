import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertesModule } from '../alertes/alertes.module';
import { DataSourcesModule } from '../data-sources/data-sources.module';
import { EtlController } from './etl.controller';
import { EtlJobsService } from './etl-jobs.service';
import { EtlScheduler } from './etl.scheduler';
import { EtlService } from './etl.service';
import { EtlPipelineJob } from './entities/etl-pipeline-job.entity';

@Module({
  imports: [
    AlertesModule,
    DataSourcesModule,
    TypeOrmModule.forFeature([EtlPipelineJob]),
  ],
  controllers: [EtlController],
  providers: [EtlService, EtlJobsService, EtlScheduler],
  exports: [EtlService, EtlJobsService],
})
export class EtlModule {}
