import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  ClimateDataSource,
  ClimateObservation,
} from './entities/climate-observation.entity';
import { ZoneType } from '../zone-indicators/entities/zone-indicator.entity';

@Injectable()
export class ClimateService {
  constructor(
    @InjectRepository(ClimateObservation)
    private readonly climateObservationsRepository: Repository<ClimateObservation>,
  ) {}

  findAll(params: {
    source?: ClimateDataSource;
    zoneType?: ZoneType;
    zoneId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (params.source) {
      where.source = params.source;
    }

    if (params.zoneType) {
      where.zoneType = params.zoneType;
    }

    if (params.zoneId) {
      where.zoneId = params.zoneId;
    }

    if (params.startDate && params.endDate) {
      where.observedDate = Between(params.startDate, params.endDate);
    }

    return this.climateObservationsRepository.find({
      where,
      order: {
        observedDate: 'DESC',
        zoneNom: 'ASC',
      },
      take: Math.min(Math.max(Number(params.limit) || 200, 1), 2000),
    });
  }

  async latest(source = ClimateDataSource.NASA_POWER, zoneType?: ZoneType) {
    const qb = this.climateObservationsRepository
      .createQueryBuilder('obs')
      .where('obs.source = :source', { source });

    if (zoneType) {
      qb.andWhere('obs.zoneType = :zoneType', { zoneType });
    }

    const latestDate = await qb
      .clone()
      .select('MAX(obs.observedDate)', 'max')
      .getRawOne<{ max: string | null }>();

    if (!latestDate?.max) {
      return [];
    }

    return qb
      .andWhere('obs.observedDate = :date', { date: latestDate.max })
      .orderBy('obs.zoneNom', 'ASC')
      .getMany();
  }

  async summary(source = ClimateDataSource.NASA_POWER) {
    const rows = await this.climateObservationsRepository.find({
      where: {
        source,
      },
    });

    const latest = rows
      .map((row) => row.observedDate)
      .sort()
      .at(-1);

    const temperatures = rows
      .map((row) => row.temperatureMean)
      .filter((value): value is number => typeof value === 'number');

    const humidity = rows
      .map((row) => row.humidityMean)
      .filter((value): value is number => typeof value === 'number');

    const wind = rows
      .map((row) => row.windSpeedMean)
      .filter((value): value is number => typeof value === 'number');

    const precipitation = rows
      .map((row) => row.precipitation)
      .filter((value): value is number => typeof value === 'number');

    const average = (values: number[]) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;

    return {
      source,
      totalObservations: rows.length,
      latestDate: latest ?? null,
      temperatureMean: average(temperatures),
      humidityMean: average(humidity),
      windSpeedMean: average(wind),
      precipitationTotal: precipitation.length
        ? precipitation.reduce((sum, value) => sum + value, 0)
        : null,
    };
  }
}
