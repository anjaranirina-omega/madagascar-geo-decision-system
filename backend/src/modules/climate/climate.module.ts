import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClimateController } from './climate.controller';
import { ClimateScheduler } from './climate.scheduler';
import { ClimateService } from './climate.service';
import { ClimateSyncService } from './climate-sync.service';
import { ClimateObservation } from './entities/climate-observation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClimateObservation])],
  controllers: [ClimateController],
  providers: [ClimateService, ClimateSyncService, ClimateScheduler],
  exports: [ClimateService, ClimateSyncService],
})
export class ClimateModule {}
