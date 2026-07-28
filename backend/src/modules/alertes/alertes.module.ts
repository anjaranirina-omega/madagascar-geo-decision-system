import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeteoModule } from '../meteo/meteo.module';
import { Alerte } from './entities/alerte.entity';
import { AlertesController } from './alertes.controller';
import { AlertesScheduler } from './alertes.scheduler';
import { AlertesService } from './alertes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alerte]), MeteoModule],
  controllers: [AlertesController],
  providers: [AlertesService, AlertesScheduler],
  exports: [AlertesService],
})
export class AlertesModule {}
