import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  OperationalRiskSignal,
  OperationalRiskType,
  OperationalSignalLevel,
} from './entities/operational-risk-signal.entity';

type SignalInput = {
  riskType: OperationalRiskType;
  zoneType: string;
  zoneId: string;
  zoneNom: string;
  backgroundRiskMax: number;
  backgroundRiskMean: number;
  weatherFactor: number;
  observedAt: Date | null;
  details: Record<string, unknown>;
};

@Injectable()
export class OperationalSignalsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(OperationalRiskSignal)
    private readonly signalsRepository: Repository<OperationalRiskSignal>,
  ) {}

  private classify(score: number) {
    if (score <= 30) return OperationalSignalLevel.FAIBLE;
    if (score <= 60) return OperationalSignalLevel.MOYEN;
    if (score <= 80) return OperationalSignalLevel.ELEVE;
    return OperationalSignalLevel.CRITIQUE;
  }

  private buildMessage(input: SignalInput, signalScore: number) {
    const label: Record<OperationalRiskType, string> = {
      FLOOD: 'inondation',
      DROUGHT: 'sécheresse / chaleur',
      LANDSLIDE: 'glissement de terrain',
      CYCLONE: 'vent sur zone exposée au risque cyclonique',
    };

    const caution =
      input.riskType === OperationalRiskType.CYCLONE
        ? ' Ce signal ne signifie pas qu’un cyclone actif est détecté.'
        : '';

    return `Signal opérationnel ${label[input.riskType]} pour ${input.zoneNom}. Score ${signalScore.toFixed(
      1,
    )}/100, basé sur le risque de fond et les dernières observations météo.${caution}`;
  }

  private computeSignal(input: SignalInput) {
    const background = Math.max(
      Number(input.backgroundRiskMax ?? 0),
      Number(input.backgroundRiskMean ?? 0),
    );

    const weather = Math.min(Math.max(input.weatherFactor, 0), 1) * 100;

    switch (input.riskType) {
      case OperationalRiskType.FLOOD:
        return 0.7 * background + 0.3 * weather;
      case OperationalRiskType.LANDSLIDE:
        return 0.75 * background + 0.25 * weather;
      case OperationalRiskType.CYCLONE:
        return 0.7 * background + 0.3 * weather;
      case OperationalRiskType.DROUGHT:
        return 0.8 * background + 0.2 * weather;
      default:
        return background;
    }
  }

  private async upsertSignal(input: SignalInput) {
    const signalScore = Number(this.computeSignal(input).toFixed(2));
    const signalLevel = this.classify(signalScore);
    const message = this.buildMessage(input, signalScore);

    const existing = await this.signalsRepository.findOne({
      where: {
        riskType: input.riskType,
        zoneType: input.zoneType,
        zoneId: input.zoneId,
      },
    });

    if (existing) {
      Object.assign(existing, {
        zoneNom: input.zoneNom,
        backgroundRiskMax: input.backgroundRiskMax,
        backgroundRiskMean: input.backgroundRiskMean,
        weatherFactor: input.weatherFactor,
        signalScore,
        signalLevel,
        message,
        observedAt: input.observedAt,
        details: input.details,
      });

      return this.signalsRepository.save(existing);
    }

    return this.signalsRepository.save(
      this.signalsRepository.create({
        riskType: input.riskType,
        zoneType: input.zoneType,
        zoneId: input.zoneId,
        zoneNom: input.zoneNom,
        backgroundRiskMax: input.backgroundRiskMax,
        backgroundRiskMean: input.backgroundRiskMean,
        weatherFactor: input.weatherFactor,
        signalScore,
        signalLevel,
        message,
        observedAt: input.observedAt,
        details: input.details,
      }),
    );
  }

  private rainfallSignal(rain1h?: number | null, rain3h?: number | null, mode: 'flood' | 'landslide' = 'flood') {
    const r1 = Number(rain1h ?? 0);
    const r3 = Number(rain3h ?? 0);

    if (mode === 'landslide') {
      return Math.min(Math.max(Math.max(r1 / 15, r3 / 40), 0), 1);
    }

    return Math.min(Math.max(Math.max(r1 / 20, r3 / 50), 0), 1);
  }

  private windSignal(windSpeed?: number | null, windGust?: number | null) {
    const speed = Number(windSpeed ?? 0);
    const gust = Number(windGust ?? 0);

    return Math.min(Math.max(Math.max(speed / 15, gust / 25), 0), 1);
  }

  private heatSignal(temperature?: number | null) {
    const temp = Number(temperature ?? 0);

    return Math.min(Math.max(temp / 35, 0), 1);
  }

  async recompute(zoneType = 'region') {
    const rows = await this.dataSource.query(
      `
      WITH latest_weather AS (
        SELECT DISTINCT ON (zone_type, zone_id)
          zone_type,
          zone_id,
          zone_nom,
          temperature,
          humidity,
          wind_speed,
          wind_gust,
          rainfall,
          rain_1h,
          rain_3h,
          clouds,
          observed_at
        FROM weather_observations
        WHERE source = 'OPENWEATHER'
          AND zone_type = $1
          AND zone_id IS NOT NULL
        ORDER BY zone_type, zone_id, observed_at DESC
      )
      SELECT
        zri.risk_type,
        zri.zone_type,
        zri.zone_id,
        zri.zone_nom,
        zri.risk_max,
        zri.risk_mean,
        lw.temperature,
        lw.humidity,
        lw.wind_speed,
        lw.wind_gust,
        lw.rainfall,
        lw.rain_1h,
        lw.rain_3h,
        lw.clouds,
        lw.observed_at
      FROM zone_risk_indicators zri
      JOIN latest_weather lw
        ON lw.zone_id = zri.zone_id
       AND lw.zone_type = zri.zone_type::text
      WHERE zri.zone_type::text = $1
        AND zri.risk_type::text IN ('FLOOD', 'DROUGHT', 'LANDSLIDE', 'CYCLONE')
      `,
      [zoneType],
    );

    const saved: OperationalRiskSignal[] = [];

    for (const row of rows) {
      const riskType = String(row.risk_type) as OperationalRiskType;

      let weatherFactor = 0;

      if (riskType === OperationalRiskType.FLOOD) {
        weatherFactor = this.rainfallSignal(row.rain_1h, row.rain_3h, 'flood');
      } else if (riskType === OperationalRiskType.LANDSLIDE) {
        weatherFactor = this.rainfallSignal(row.rain_1h, row.rain_3h, 'landslide');
      } else if (riskType === OperationalRiskType.CYCLONE) {
        weatherFactor = this.windSignal(row.wind_speed, row.wind_gust);
      } else if (riskType === OperationalRiskType.DROUGHT) {
        weatherFactor = this.heatSignal(row.temperature);
      }

      saved.push(
        await this.upsertSignal({
          riskType,
          zoneType: row.zone_type,
          zoneId: row.zone_id,
          zoneNom: row.zone_nom,
          backgroundRiskMax: Number(row.risk_max ?? 0),
          backgroundRiskMean: Number(row.risk_mean ?? 0),
          weatherFactor,
          observedAt: row.observed_at ? new Date(row.observed_at) : null,
          details: {
            temperature: row.temperature,
            humidity: row.humidity,
            windSpeed: row.wind_speed,
            windGust: row.wind_gust,
            rainfall: row.rainfall,
            rain1h: row.rain_1h,
            rain3h: row.rain_3h,
            clouds: row.clouds,
          },
        }),
      );
    }

    return {
      message: `${saved.length} signal(aux) opérationnel(s) recalculé(s).`,
      zoneType,
      count: saved.length,
      signals: saved,
    };
  }

  findAll(params?: { riskType?: OperationalRiskType; zoneType?: string }) {
    return this.signalsRepository.find({
      where: {
        ...(params?.riskType ? { riskType: params.riskType } : {}),
        ...(params?.zoneType ? { zoneType: params.zoneType } : {}),
      },
      order: {
        signalScore: 'DESC',
      },
    });
  }

  findLatestCritical() {
    return this.signalsRepository.find({
      where: [
        { signalLevel: OperationalSignalLevel.CRITIQUE },
        { signalLevel: OperationalSignalLevel.ELEVE },
      ],
      order: {
        signalScore: 'DESC',
      },
      take: 20,
    });
  }
}
