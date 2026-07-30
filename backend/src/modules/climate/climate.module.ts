import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClimateController } from './climate.controller';
import { ClimateService } from './climate.service';
import { ClimateObservation } from './entities/climate-observation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClimateObservation])],
  controllers: [ClimateController],
  providers: [ClimateService],
  exports: [ClimateService],
})
export class ClimateModule {}
