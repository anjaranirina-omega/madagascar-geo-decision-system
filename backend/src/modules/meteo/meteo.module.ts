import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourcesModule } from '../data-sources/data-sources.module';
import { WeatherObservation } from './entities/weather-observation.entity';
import { MeteoController } from './meteo.controller';
import { MeteoScheduler } from './meteo.scheduler';
import { MeteoService } from './meteo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeatherObservation]),
    DataSourcesModule,
  ],
  controllers: [MeteoController],
  providers: [MeteoService, MeteoScheduler],
  exports: [MeteoService],
})
export class MeteoModule {}
