import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourcesModule } from '../data-sources/data-sources.module';
import { ActiveCyclone } from './entities/active-cyclone.entity';
import { WeatherObservation } from './entities/weather-observation.entity';
import { MeteoController } from './meteo.controller';
import { MeteoScheduler } from './meteo.scheduler';
import { MeteoService } from './meteo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeatherObservation, ActiveCyclone]),
    DataSourcesModule,
  ],
  controllers: [MeteoController],
  providers: [MeteoService, MeteoScheduler],
  exports: [MeteoService],
})
export class MeteoModule {}
