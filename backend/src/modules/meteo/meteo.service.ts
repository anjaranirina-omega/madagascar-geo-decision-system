import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeatherObservation } from './entities/weather-observation.entity';

type OpenWeatherResponse = {
  coord: {
    lon: number;
    lat: number;
  };
  weather?: {
    main: string;
    description: string;
  }[];
  main?: {
    temp: number;
    pressure: number;
    humidity: number;
  };
  wind?: {
    speed: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  dt?: number;
};

@Injectable()
export class MeteoService {
  constructor(
    @InjectRepository(WeatherObservation)
    private readonly weatherRepository: Repository<WeatherObservation>,
  ) {}

  async getCurrentWeather(lat: number, lng: number) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const baseUrl =
      process.env.OPENWEATHER_BASE_URL ??
      'https://api.openweathermap.org/data/2.5';

    if (!apiKey) {
      throw new BadRequestException('OPENWEATHER_API_KEY non configurée.');
    }

    const url = new URL(`${baseUrl}/weather`);

    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'fr');

    const response = await fetch(url.toString());

    if (!response.ok) {
      const body = await response.text();

      throw new InternalServerErrorException(
        `Erreur OpenWeather ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as OpenWeatherResponse;

    const observation = this.weatherRepository.create({
      source: 'OPENWEATHER',
      latitude: data.coord?.lat ?? lat,
      longitude: data.coord?.lon ?? lng,
      temperature: data.main?.temp,
      humidity: data.main?.humidity,
      pressure: data.main?.pressure,
      windSpeed: data.wind?.speed,
      rainfall: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
      weatherMain: data.weather?.[0]?.main,
      weatherDescription: data.weather?.[0]?.description,
      observedAt: data.dt ? new Date(data.dt * 1000) : new Date(),
    });

    const saved = await this.weatherRepository.save(observation);

    return {
      id: saved.id,
      source: saved.source,
      latitude: saved.latitude,
      longitude: saved.longitude,
      temperature: saved.temperature,
      humidity: saved.humidity,
      pressure: saved.pressure,
      windSpeed: saved.windSpeed,
      rainfall: saved.rainfall,
      weatherMain: saved.weatherMain,
      weatherDescription: saved.weatherDescription,
      observedAt: saved.observedAt,
      createdAt: saved.createdAt,
    };
  }

  async findLatest(limit = 20) {
    return this.weatherRepository.find({
      order: {
        observedAt: 'DESC',
      },
      take: limit,
    });
  }
}
