import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherObservation } from './entities/weather-observation.entity';
import { MeteoController } from './meteo.controller';
import { MeteoService } from './meteo.service';

@Module({
  imports: [TypeOrmModule.forFeature([WeatherObservation])],
  controllers: [MeteoController],
  providers: [MeteoService],
  exports: [MeteoService],
})
export class MeteoModule {}
