import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DataSourcesService } from '../data-sources/data-sources.service';
import { DataSourceCode } from '../data-sources/entities/data-source-status.entity';
import { SyncActiveCyclonesDto } from './dto/sync-active-cyclones.dto';
import { ActiveCyclone } from './entities/active-cyclone.entity';
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
    gust?: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  clouds?: {
    all?: number;
  };
  dt?: number;
};

type WeatherZone = {
  id: string;
  code: string;
  nom: string;
  latitude: number;
  longitude: number;
};

@Injectable()
export class MeteoService {
  private readonly logger = new Logger(MeteoService.name);

  constructor(
    @InjectRepository(WeatherObservation)
    private readonly weatherRepository: Repository<WeatherObservation>,
    @InjectRepository(ActiveCyclone)
    private readonly activeCycloneRepository: Repository<ActiveCyclone>,
    private readonly dataSource: DataSource,
    private readonly dataSourcesService: DataSourcesService,
  ) {}

  private getOpenWeatherConfig() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const baseUrl =
      process.env.OPENWEATHER_BASE_URL ??
      'https://api.openweathermap.org/data/2.5';

    if (!apiKey) {
      throw new BadRequestException('OPENWEATHER_API_KEY non configurée.');
    }

    return {
      apiKey,
      baseUrl,
    };
  }

  private async fetchOpenWeather(lat: number, lng: number) {
    const { apiKey, baseUrl } = this.getOpenWeatherConfig();

    const url = new URL(`${baseUrl}/weather`);

    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'fr');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;

    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `OpenWeather indisponible ou délai dépassé: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();

      throw new InternalServerErrorException(
        `Erreur OpenWeather ${response.status}: ${body}`,
      );
    }

    // Check daily quota before returning response
    await this.checkOpenWeatherQuota();

    return (await response.json()) as OpenWeatherResponse;
  }
  private async checkOpenWeatherQuota() {
    const quotaEnv = process.env.OPENWEATHER_DAILY_QUOTA;
    const defaultQuota = 950;
    const maxQuota = Number(quotaEnv) || defaultQuota;

    const sourceRepo = await this.dataSourcesService.findOne(DataSourceCode.OPENWEATHER);
    if (!sourceRepo) {
      this.logger.warn('Source OpenWeather non trouvee en base, pas de protection de quota.');
      return;
    }

    const metadata = sourceRepo.metadata ?? {};
    const dailyCount = Number(metadata.dailyCallCount) || 0;
    const lastReset = metadata.lastResetDate;
    const today = new Date().toISOString().split('T')[0];

    // Reset counter if new day
    if (lastReset !== today) {
      this.logger.log('Reset compteur quotidien OpenWeather (nouvelle journee).');
      await this.dataSourcesService.markSuccess(DataSourceCode.OPENWEATHER, {
        metadata: {
          dailyCallCount: 0,
          lastResetDate: today,
        },
      });
      return;
    }

    if (dailyCount >= maxQuota) {
      throw new ServiceUnavailableException(
        `Quota OpenWeather quotidien atteint (${dailyCount} / ${maxQuota}). Reessayez demain.`
      );
    }

    // Increment counter after successful check
    await this.dataSourcesService.markSuccess(DataSourceCode.OPENWEATHER, {
      metadata: {
        dailyCallCount: dailyCount + 1,
        lastResetDate: today,
      },
    });
  }

  private buildObservationPayload(params: {
    data: OpenWeatherResponse;
    fallbackLat: number;
    fallbackLng: number;
    zoneType?: string | null;
    zoneId?: string | null;
    zoneNom?: string | null;
  }) {
    const { data, fallbackLat, fallbackLng, zoneType, zoneId, zoneNom } =
      params;

    const rain1h = data.rain?.['1h'] ?? null;
    const rain3h = data.rain?.['3h'] ?? null;

    return {
      source: 'OPENWEATHER',
      zoneType: zoneType ?? null,
      zoneId: zoneId ?? null,
      zoneNom: zoneNom ?? null,
      latitude: data.coord?.lat ?? fallbackLat,
      longitude: data.coord?.lon ?? fallbackLng,
      temperature: data.main?.temp ?? null,
      humidity: data.main?.humidity ?? null,
      pressure: data.main?.pressure ?? null,
      windSpeed: data.wind?.speed ?? null,
      windGust: data.wind?.gust ?? null,
      rainfall: rain1h ?? rain3h ?? 0,
      rain1h,
      rain3h,
      clouds: data.clouds?.all ?? null,
      weatherMain: data.weather?.[0]?.main ?? null,
      weatherDescription: data.weather?.[0]?.description ?? null,
      observedAt: data.dt ? new Date(data.dt * 1000) : new Date(),
      raw: data as unknown as Record<string, unknown>,
    };
  }

  private async saveObservation(
    payload: Partial<WeatherObservation> & {
      source: string;
      latitude: number;
      longitude: number;
      observedAt: Date;
    },
  ) {
    if (payload.zoneType && payload.zoneId) {
      const existing = await this.weatherRepository.findOne({
        where: {
          source: payload.source,
          zoneType: payload.zoneType,
          zoneId: payload.zoneId,
          observedAt: payload.observedAt,
        },
      });

      if (existing) {
        Object.assign(existing, payload);
        return this.weatherRepository.save(existing);
      }
    }

    return this.weatherRepository.save(
      this.weatherRepository.create(payload),
    );
  }

  async getCurrentWeather(lat: number, lng: number) {
    const data = await this.fetchOpenWeather(lat, lng);

    const payload = this.buildObservationPayload({
      data,
      fallbackLat: lat,
      fallbackLng: lng,
    });

    const saved = await this.saveObservation(payload);

    return this.serializeObservation(saved);
  }

  private serializeObservation(saved: WeatherObservation) {
    return {
      id: saved.id,
      source: saved.source,
      zoneType: saved.zoneType,
      zoneId: saved.zoneId,
      zoneNom: saved.zoneNom,
      latitude: saved.latitude,
      longitude: saved.longitude,
      temperature: saved.temperature,
      humidity: saved.humidity,
      pressure: saved.pressure,
      windSpeed: saved.windSpeed,
      windGust: saved.windGust,
      rainfall: saved.rainfall,
      rain1h: saved.rain1h,
      rain3h: saved.rain3h,
      clouds: saved.clouds,
      weatherMain: saved.weatherMain,
      weatherDescription: saved.weatherDescription,
      observedAt: saved.observedAt,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async findLatest(limit = 20) {
    return this.weatherRepository.find({
      order: {
        observedAt: 'DESC',
      },
      take: Math.min(Math.max(Number(limit) || 20, 1), 500),
    });
  }

  private async readRegionWeatherZones(): Promise<WeatherZone[]> {
    const rows = await this.dataSource.query(`
      SELECT
        id::text AS id,
        code,
        nom,
        ST_Y(ST_PointOnSurface(geom)) AS latitude,
        ST_X(ST_PointOnSurface(geom)) AS longitude
      FROM regions
      WHERE geom IS NOT NULL
      ORDER BY nom ASC
    `);

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      code: String(row.code),
      nom: String(row.nom),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }));
  }

  async syncRegionsWeather() {
    await this.dataSourcesService.markSyncStart(DataSourceCode.OPENWEATHER);

    const startedAt = Date.now();
    const zones = await this.readRegionWeatherZones();

    const results: Array<{
      zoneId: string;
      zoneNom: string;
      status: 'SUCCESS' | 'FAILED';
      observationId?: string;
      error?: string;
    }> = [];

    let successCount = 0;
    let failedCount = 0;

    for (const zone of zones) {
      try {
        const data = await this.fetchOpenWeather(zone.latitude, zone.longitude);

        const payload = this.buildObservationPayload({
          data,
          fallbackLat: zone.latitude,
          fallbackLng: zone.longitude,
          zoneType: 'region',
          zoneId: zone.id,
          zoneNom: zone.nom,
        });

        const saved = await this.saveObservation(payload);

        successCount += 1;

        results.push({
          zoneId: zone.id,
          zoneNom: zone.nom,
          status: 'SUCCESS',
          observationId: saved.id,
        });
      } catch (error) {
        failedCount += 1;

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.warn(
          `OpenWeather région ${zone.nom} échoué : ${errorMessage}`,
        );

        results.push({
          zoneId: zone.id,
          zoneNom: zone.nom,
          status: 'FAILED',
          error: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startedAt;

    if (successCount > 0) {
      await this.dataSourcesService.markSuccess(DataSourceCode.OPENWEATHER, {
        lastSyncType: 'regional_realtime_weather',
        zoneLevel: 'region',
        zonesCount: zones.length,
        successCount,
        failedCount,
        durationMs,
      });
    } else {
      await this.dataSourcesService.markFailed(
        DataSourceCode.OPENWEATHER,
        'Aucune observation OpenWeather régionale synchronisée.',
      );
    }

    return {
      message: `Synchronisation météo régionale terminée : ${successCount} succès, ${failedCount} échec(s).`,
      zoneType: 'region',
      zonesCount: zones.length,
      successCount,
      failedCount,
      durationMs,
      results,
    };
  }

  async findLatestByZone(zoneType = 'region') {
    return this.dataSource.query(
      `
      SELECT DISTINCT ON (zone_type, zone_id)
        id,
        source,
        zone_type AS "zoneType",
        zone_id AS "zoneId",
        zone_nom AS "zoneNom",
        latitude,
        longitude,
        temperature,
        humidity,
        pressure,
        wind_speed AS "windSpeed",
        wind_gust AS "windGust",
        rainfall,
        rain_1h AS "rain1h",
        rain_3h AS "rain3h",
        clouds,
        weather_main AS "weatherMain",
        weather_description AS "weatherDescription",
        observed_at AS "observedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM weather_observations
      WHERE zone_type = $1
        AND zone_id IS NOT NULL
      ORDER BY zone_type, zone_id, observed_at DESC
      `,
      [zoneType],
    );
  }

  async syncActiveCyclones(dto: SyncActiveCyclonesDto) {
    const fetchedAt = dto.fetchedAt ? new Date(dto.fetchedAt) : new Date();
    const cyclonesList = dto.cyclones ?? [];

    return this.dataSource.transaction(async (manager) => {
      const activeCycloneRepo = manager.getRepository(ActiveCyclone);
      const savedIds: string[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of cyclonesList) {
        let existing: ActiveCyclone | null = null;
        if (item.gdacsEpisodeId) {
          existing = await activeCycloneRepo.findOne({
            where: {
              gdacsEventId: item.gdacsEventId,
              gdacsEpisodeId: item.gdacsEpisodeId,
            },
          });
        } else {
          existing = await activeCycloneRepo.findOne({
            where: {
              gdacsEventId: item.gdacsEventId,
            },
          });
        }

        if (existing) {
          existing.name = item.name;
          existing.latitude = item.latitude !== undefined ? item.latitude : existing.latitude;
          existing.longitude = item.longitude !== undefined ? item.longitude : existing.longitude;
          existing.windSpeed = item.windSpeed !== undefined ? item.windSpeed : existing.windSpeed;
          existing.severityLevel = item.severityLevel ?? existing.severityLevel;
          existing.country = item.country !== undefined ? item.country : existing.country;
          existing.fromDate = item.fromDate ? new Date(item.fromDate) : existing.fromDate;
          existing.toDate = item.toDate ? new Date(item.toDate) : existing.toDate;
          if (item.trackGeojson !== undefined) {
            existing.trackGeojson = item.trackGeojson;
          }
          existing.isActive = true;
          existing.fetchedAt = fetchedAt;

          const saved = await activeCycloneRepo.save(existing);
          savedIds.push(saved.id);
          updatedCount++;
        } else {
          const newCyclone = activeCycloneRepo.create({
            gdacsEventId: item.gdacsEventId,
            gdacsEpisodeId: item.gdacsEpisodeId ?? null,
            name: item.name,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            windSpeed: item.windSpeed ?? null,
            severityLevel: item.severityLevel,
            country: item.country ?? null,
            fromDate: item.fromDate ? new Date(item.fromDate) : null,
            toDate: item.toDate ? new Date(item.toDate) : null,
            trackGeojson: item.trackGeojson ?? null,
            isActive: true,
            fetchedAt,
          });

          const saved = await activeCycloneRepo.save(newCyclone);
          savedIds.push(saved.id);
          createdCount++;
        }
      }

      // Deactivate cyclones that are no longer active in this synchronization batch
      let deactivatedCount = 0;
      if (savedIds.length > 0) {
        const updateResult = await activeCycloneRepo
          .createQueryBuilder()
          .update(ActiveCyclone)
          .set({ isActive: false })
          .where('isActive = :isActive', { isActive: true })
          .andWhere('id NOT IN (:...savedIds)', { savedIds })
          .execute();
        deactivatedCount = updateResult.affected ?? 0;
      } else {
        const updateResult = await activeCycloneRepo
          .createQueryBuilder()
          .update(ActiveCyclone)
          .set({ isActive: false })
          .where('isActive = :isActive', { isActive: true })
          .execute();
        deactivatedCount = updateResult.affected ?? 0;
      }

      const activeCyclones = await activeCycloneRepo.find({
        where: { isActive: true },
        order: { fetchedAt: 'DESC', name: 'ASC' },
      });

      this.logger.log(
        `[SyncActiveCyclones] Synchronisation terminée : ${createdCount} créé(s), ${updatedCount} mis à jour, ${deactivatedCount} désactivé(s). Total actifs : ${activeCyclones.length}`,
      );

      return {
        message: 'Synchronisation des cyclones terminée avec succès.',
        syncedAt: fetchedAt,
        totalReceived: cyclonesList.length,
        createdCount,
        updatedCount,
        deactivatedCount,
        activeCount: activeCyclones.length,
        activeCyclones,
      };
    });
  }

  async findActiveCyclones(includeInactive = false) {
    return this.activeCycloneRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: {
        isActive: 'DESC',
        fetchedAt: 'DESC',
        name: 'ASC',
      },
    });
  }

  async findActiveCycloneById(id: string) {
    const cyclone = await this.activeCycloneRepository.findOne({
      where: { id },
    });

    if (!cyclone) {
      throw new NotFoundException(`Cyclone introuvable avec l'identifiant : ${id}`);
    }

    return cyclone;
  }
}
