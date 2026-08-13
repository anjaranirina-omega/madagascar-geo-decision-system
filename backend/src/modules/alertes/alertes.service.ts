import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeteoService } from '../meteo/meteo.service';
import { CreateAlerteDto } from './dto/create-alerte.dto';
import { GenerateRiskAlertesDto } from './dto/generate-risk-alertes.dto';
import { GenerateWeatherRiskAlertDto } from './dto/generate-weather-risk-alert.dto';
import { GenerateOperationalAlertsDto } from './dto/generate-operational-alerts.dto';
import {
  Alerte,
  AlerteNiveau,
  AlerteStatus,
  AlerteType,
} from './entities/alerte.entity';

@Injectable()
export class AlertesService {
  constructor(
    @InjectRepository(Alerte)
    private readonly alertesRepository: Repository<Alerte>,

    private readonly meteoService: MeteoService,
  ) {}

  create(dto: CreateAlerteDto) {
    const alerte = this.alertesRepository.create({
      ...dto,
      status: AlerteStatus.ACTIVE,
    });

    return this.alertesRepository.save(alerte);
  }

  findAll() {
    return this.alertesRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  findActive() {
    return this.alertesRepository.find({
      where: {
        status: AlerteStatus.ACTIVE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const alerte = await this.alertesRepository.findOne({
      where: { id },
    });

    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }

    return alerte;
  }

  async resolve(id: string) {
    const alerte = await this.findOne(id);

    alerte.status = AlerteStatus.RESOLUE;
    alerte.resolvedAt = new Date();

    return this.alertesRepository.save(alerte);
  }

  async ignore(id: string) {
    const alerte = await this.findOne(id);

    alerte.status = AlerteStatus.IGNOREE;

    return this.alertesRepository.save(alerte);
  }

  private getNiveauFromRisk(
    riskMax: number,
    thresholdEleve: number,
    thresholdCritique: number,
  ) {
    if (riskMax >= thresholdCritique) {
      return AlerteNiveau.CRITIQUE;
    }

    if (riskMax >= thresholdEleve) {
      return AlerteNiveau.ELEVE;
    }

    return null;
  }

  private buildGlobalRiskTitle(zoneNom: string, niveau: AlerteNiveau) {
    return niveau === AlerteNiveau.CRITIQUE
      ? `Risque climatique critique - ${zoneNom}`
      : `Risque climatique élevé - ${zoneNom}`;
  }

  private buildGlobalRiskMessage(params: {
    zoneNom: string;
    riskMax: number;
    riskMean?: number;
    populationExposed?: number;
    niveau: AlerteNiveau;
  }) {
    const populationText =
      params.populationExposed !== undefined
        ? ` Population exposée estimée : ${Math.round(params.populationExposed).toLocaleString('fr-FR')} habitants.`
        : '';

    const meanText =
      params.riskMean !== undefined
        ? ` Risque moyen de la zone : ${params.riskMean.toFixed(1)}/100.`
        : '';

    return params.niveau === AlerteNiveau.CRITIQUE
      ? `La zone ${params.zoneNom} présente un risque climatique global critique avec un risque maximum de ${params.riskMax.toFixed(1)}/100.${meanText}${populationText} Une surveillance renforcée est recommandée.`
      : `La zone ${params.zoneNom} présente un risque climatique global élevé avec un risque maximum de ${params.riskMax.toFixed(1)}/100.${meanText}${populationText} Une surveillance est recommandée.`;
  }

  /**
   * Génère des alertes globales à partir des statistiques zonales réelles.
   * Les alertes existantes sont mises à jour.
   * Les alertes actives devenues obsolètes sont résolues automatiquement.
   */
  async generateFromRisk(dto: GenerateRiskAlertesDto) {
    const zoneType = dto.zoneType ?? 'region';
    const thresholdEleve = dto.thresholdEleve ?? 61;
    const thresholdCritique = dto.thresholdCritique ?? 81;

    const indicators = await this.alertesRepository.query(
      `
      SELECT
        zone_type,
        zone_id,
        zone_nom,
        population_exposed,
        risk_mean,
        risk_max,
        risk_level,
        updated_at
      FROM zone_indicators
      WHERE zone_type = $1
      AND risk_max IS NOT NULL
      ORDER BY risk_max DESC
      `,
      [zoneType],
    );

    const created: Alerte[] = [];
    const updated: Alerte[] = [];
    const resolved: Alerte[] = [];

    const zonesStillAlerted = new Set<string>();

    for (const indicator of indicators) {
      const riskMax = Number(indicator.risk_max);
      const riskMean =
        indicator.risk_mean !== null ? Number(indicator.risk_mean) : undefined;
      const populationExposed =
        indicator.population_exposed !== null
          ? Number(indicator.population_exposed)
          : undefined;

      const niveau = this.getNiveauFromRisk(
        riskMax,
        thresholdEleve,
        thresholdCritique,
      );

      const existing = await this.alertesRepository.findOne({
        where: {
          zoneType,
          zoneId: indicator.zone_id,
          type: AlerteType.RISQUE_GLOBAL,
          status: AlerteStatus.ACTIVE,
        },
      });

      if (!niveau) {
        if (existing) {
          existing.status = AlerteStatus.RESOLUE;
          existing.resolvedAt = new Date();
          resolved.push(await this.alertesRepository.save(existing));
        }

        continue;
      }

      zonesStillAlerted.add(indicator.zone_id);

      const titre = this.buildGlobalRiskTitle(indicator.zone_nom, niveau);
      const message = this.buildGlobalRiskMessage({
        zoneNom: indicator.zone_nom,
        riskMax,
        riskMean,
        populationExposed,
        niveau,
      });

      if (existing) {
        existing.niveau = niveau;
        existing.titre = titre;
        existing.message = message;
        existing.riskValue = riskMax;
        existing.riskMean = riskMean;
        existing.populationExposed = populationExposed;

        updated.push(await this.alertesRepository.save(existing));
        continue;
      }

      const alerte = this.alertesRepository.create({
        type: AlerteType.RISQUE_GLOBAL,
        niveau,
        titre,
        message,
        zoneType,
        zoneId: indicator.zone_id,
        zoneNom: indicator.zone_nom,
        riskValue: riskMax,
        riskMean,
        populationExposed,
        status: AlerteStatus.ACTIVE,
      });

      created.push(await this.alertesRepository.save(alerte));
    }

    /**
     * Résoudre les alertes actives qui ne correspondent plus aux zones en dépassement.
     */
    const activeGlobalAlerts = await this.alertesRepository.find({
      where: {
        zoneType,
        type: AlerteType.RISQUE_GLOBAL,
        status: AlerteStatus.ACTIVE,
      },
    });

    for (const alerte of activeGlobalAlerts) {
      if (!alerte.zoneId) {
        continue;
      }

      if (!zonesStillAlerted.has(alerte.zoneId)) {
        alerte.status = AlerteStatus.RESOLUE;
        alerte.resolvedAt = new Date();
        resolved.push(await this.alertesRepository.save(alerte));
      }
    }

    return {
      message: `${created.length} alerte(s) créée(s), ${updated.length} mise(s) à jour, ${resolved.length} résolue(s).`,
      createdCount: created.length,
      updatedCount: updated.length,
      resolvedCount: resolved.length,
      created,
      updated,
      resolved,
    };
  }

  private mapOperationalRiskTypeToAlertType(riskType: string) {
    const mapping: Record<string, AlerteType> = {
      FLOOD: AlerteType.INONDATION,
      DROUGHT: AlerteType.SECHERESSE,
      LANDSLIDE: AlerteType.GLISSEMENT_TERRAIN,
      CYCLONE: AlerteType.CYCLONE,
    };

    return mapping[riskType] ?? AlerteType.RISQUE_GLOBAL;
  }

  private buildOperationalAlertTitle(params: {
    riskType: string;
    zoneNom: string;
    niveau: AlerteNiveau;
  }) {
    const labels: Record<string, string> = {
      FLOOD: 'inondation',
      DROUGHT: 'sécheresse / chaleur',
      LANDSLIDE: 'glissement de terrain',
      CYCLONE: 'vent sur zone exposée au risque cyclonique',
    };

    return `Signal opérationnel ${labels[params.riskType] ?? 'risque'} - ${params.zoneNom}`;
  }

  private buildOperationalAlertMessage(signal: Record<string, any>) {
    const cycloneNote =
      signal.risk_type === 'CYCLONE'
        ? ' Ce signal ne signifie pas qu’un cyclone actif est détecté ; il combine le risque cyclonique historique et les observations de vent actuelles.'
        : '';

    const details = signal.details ?? {};

    const weatherText = [
      details.temperature !== undefined && details.temperature !== null
        ? `Température : ${Number(details.temperature).toFixed(1)} °C.`
        : null,
      details.rainfall !== undefined && details.rainfall !== null
        ? `Pluie : ${Number(details.rainfall).toFixed(1)} mm.`
        : null,
      details.windSpeed !== undefined && details.windSpeed !== null
        ? `Vent : ${Number(details.windSpeed).toFixed(1)} m/s.`
        : null,
      details.windGust !== undefined && details.windGust !== null
        ? `Rafales : ${Number(details.windGust).toFixed(1)} m/s.`
        : null,
    ]
      .filter(Boolean)
      .join(' ');

    return `${signal.message} Risque de fond max : ${Number(
      signal.background_risk_max ?? 0,
    ).toFixed(1)}/100. Facteur météo : ${(
      Number(signal.weather_factor ?? 0) * 100
    ).toFixed(0)}%. ${weatherText}${cycloneNote}`;
  }

  async generateOperationalAlerts(dto: GenerateOperationalAlertsDto = {}) {
    const zoneType = dto.zoneType ?? 'region';

    const signals = await this.alertesRepository.query(
      `
      SELECT
        risk_type,
        zone_type,
        zone_id,
        zone_nom,
        background_risk_max,
        background_risk_mean,
        weather_factor,
        signal_score,
        signal_level,
        message,
        observed_at,
        details
      FROM operational_risk_signals
      WHERE zone_type = $1
        AND signal_level IN ('ELEVE', 'CRITIQUE')
      ORDER BY signal_score DESC
      `,
      [zoneType],
    );

    const created: Alerte[] = [];
    const updated: Alerte[] = [];
    const resolved: Alerte[] = [];

    const activeKeys = new Set<string>();

    for (const signal of signals) {
      const alertType = this.mapOperationalRiskTypeToAlertType(signal.risk_type);
      const niveau =
        signal.signal_level === 'CRITIQUE'
          ? AlerteNiveau.CRITIQUE
          : AlerteNiveau.ELEVE;

      const key = `${alertType}:${signal.zone_id}`;
      activeKeys.add(key);

      const titre = this.buildOperationalAlertTitle({
        riskType: signal.risk_type,
        zoneNom: signal.zone_nom,
        niveau,
      });

      const message = this.buildOperationalAlertMessage(signal);

      const existing = await this.alertesRepository.findOne({
        where: {
          zoneType,
          zoneId: signal.zone_id,
          type: alertType,
          status: AlerteStatus.ACTIVE,
        },
      });

      if (existing) {
        existing.niveau = niveau;
        existing.titre = titre;
        existing.message = message;
        existing.riskValue = Number(signal.signal_score);
        existing.riskMean =
          signal.background_risk_mean !== null
            ? Number(signal.background_risk_mean)
            : undefined;

        updated.push(await this.alertesRepository.save(existing));
        continue;
      }

      const alerte = this.alertesRepository.create({
        type: alertType,
        niveau,
        titre,
        message,
        zoneType,
        zoneId: signal.zone_id,
        zoneNom: signal.zone_nom,
        riskValue: Number(signal.signal_score),
        riskMean:
          signal.background_risk_mean !== null
            ? Number(signal.background_risk_mean)
            : undefined,
        status: AlerteStatus.ACTIVE,
      });

      created.push(await this.alertesRepository.save(alerte));
    }

    const activeOperationalAlerts = await this.alertesRepository
      .createQueryBuilder('alerte')
      .where('alerte.zoneType = :zoneType', { zoneType })
      .andWhere('alerte.status = :status', { status: AlerteStatus.ACTIVE })
      .andWhere('alerte.titre LIKE :prefix', {
        prefix: 'Signal opérationnel%',
      })
      .getMany();

    for (const alerte of activeOperationalAlerts) {
      if (!alerte.zoneId) continue;

      const key = `${alerte.type}:${alerte.zoneId}`;

      if (!activeKeys.has(key)) {
        alerte.status = AlerteStatus.RESOLUE;
        alerte.resolvedAt = new Date();

        resolved.push(await this.alertesRepository.save(alerte));
      }
    }

    return {
      message: `${created.length} alerte(s) opérationnelle(s) créée(s), ${updated.length} mise(s) à jour, ${resolved.length} résolue(s).`,
      zoneType,
      createdCount: created.length,
      updatedCount: updated.length,
      resolvedCount: resolved.length,
      created,
      updated,
      resolved,
    };
  }

  /**
   * Génère une alerte météo-risque globale.
   *
   * Important :
   * On ne génère pas ici de type INONDATION ou CYCLONE.
   * Les risques spécifiques seront ajoutés quand les modèles spécifiques existeront.
   */
  async generateWeatherRiskAlert(dto: GenerateWeatherRiskAlertDto) {
    const zoneType = dto.zoneType ?? 'region';
    const riskThreshold = dto.riskThreshold ?? 60;
    const rainfallThreshold = dto.rainfallThreshold ?? 1;
    const windThreshold = dto.windThreshold ?? 40;

    const weather = await this.meteoService.getCurrentWeather(
      dto.latitude,
      dto.longitude,
    );

    const located = await this.alertesRepository.query(
      `
      SELECT *
      FROM (
        SELECT 'commune' AS zone_type, c.id AS zone_id, c.nom AS zone_nom, c.geom
        FROM communes c
        UNION ALL
        SELECT 'district' AS zone_type, d.id AS zone_id, d.nom AS zone_nom, d.geom
        FROM districts d
        UNION ALL
        SELECT 'region' AS zone_type, r.id AS zone_id, r.nom AS zone_nom, r.geom
        FROM regions r
      ) z
      WHERE z.zone_type = $1
      AND ST_Intersects(
        z.geom,
        ST_SetSRID(ST_Point($2, $3), 4326)
      )
      LIMIT 1
      `,
      [zoneType, dto.longitude, dto.latitude],
    );

    if (!located || located.length === 0) {
      return {
        message: 'Aucune zone trouvée pour ce point.',
        weather,
        created: null,
      };
    }

    const zone = located[0];

    const [indicator] = await this.alertesRepository.query(
      `
      SELECT *
      FROM zone_indicators
      WHERE zone_type = $1
      AND zone_id = $2
      LIMIT 1
      `,
      [zone.zone_type, zone.zone_id],
    );

    if (!indicator) {
      return {
        message: 'Aucun indicateur zonal disponible pour cette zone.',
        weather,
        zone,
        created: null,
      };
    }

    const riskMax = Number(indicator.risk_max ?? 0);
    const riskMean =
      indicator.risk_mean !== null ? Number(indicator.risk_mean) : undefined;
    const populationExposed =
      indicator.population_exposed !== null
        ? Number(indicator.population_exposed)
        : undefined;

    const rainfall = Number(weather.rainfall ?? 0);
    const windKmh = Number((Number(weather.windSpeed ?? 0) * 3.6).toFixed(1));

    const rainfallAggravatesRisk =
      rainfallThreshold > 0
        ? rainfall >= rainfallThreshold
        : rainfall > 0;

    const windAggravatesRisk = windKmh >= windThreshold;

    const weatherAggravatesRisk =
      rainfallAggravatesRisk || windAggravatesRisk;

    if (riskMax < riskThreshold || !weatherAggravatesRisk) {
      return {
        message:
          'Aucune alerte générée : risque ou météo sous les seuils.',
        weather,
        zone,
        indicator,
        thresholds: {
          riskThreshold,
          rainfallThreshold,
          windThreshold,
        },
        created: null,
      };
    }

    const niveau =
      riskMax >= 81 || rainfall >= 10 || windKmh >= 70
        ? AlerteNiveau.CRITIQUE
        : AlerteNiveau.ELEVE;

    const existing = await this.alertesRepository.findOne({
      where: {
        zoneType: zone.zone_type,
        zoneId: zone.zone_id,
        type: AlerteType.RISQUE_GLOBAL,
        status: AlerteStatus.ACTIVE,
      },
    });

    const titre = `Alerte météo-risque - ${zone.zone_nom}`;

    const message = `La zone ${zone.zone_nom} présente un risque climatique global de ${riskMax.toFixed(
      1,
    )}/100. Les conditions météo actuelles renforcent la vigilance : pluie ${rainfall.toFixed(
      1,
    )} mm, vent ${windKmh.toFixed(1)} km/h.`;

    if (existing) {
      existing.niveau = niveau;
      existing.titre = titre;
      existing.message = message;
      existing.riskValue = riskMax;
      existing.riskMean = riskMean;
      existing.populationExposed = populationExposed;

      const updated = await this.alertesRepository.save(existing);

      return {
        message: 'Alerte météo-risque existante mise à jour.',
        weather,
        zone,
        indicator,
        updated,
      };
    }

    const alerte = this.alertesRepository.create({
      type: AlerteType.RISQUE_GLOBAL,
      niveau,
      titre,
      message,
      zoneType: zone.zone_type,
      zoneId: zone.zone_id,
      zoneNom: zone.zone_nom,
      riskValue: riskMax,
      riskMean,
      populationExposed,
      status: AlerteStatus.ACTIVE,
    });

    const created = await this.alertesRepository.save(alerte);

    return {
      message: 'Alerte météo-risque générée.',
      weather,
      zone,
      indicator,
      created,
    };
  }

  async autoGenerateWeatherRiskAlerts() {
    const riskThreshold = Number(process.env.AUTO_ALERT_RISK_THRESHOLD ?? 60);
    const rainfallThreshold = Number(process.env.AUTO_ALERT_RAINFALL_THRESHOLD ?? 1);
    const windThreshold = Number(process.env.AUTO_ALERT_WIND_THRESHOLD ?? 40);
    const limit = Number(process.env.AUTO_ALERT_ZONE_LIMIT ?? 10);

    const zones = await this.alertesRepository.query(
      `
      SELECT
        zi.zone_type,
        zi.zone_id,
        zi.zone_nom,
        zi.population_exposed,
        zi.risk_mean,
        zi.risk_max,
        ST_Y(ST_Centroid(z.geom)) AS latitude,
        ST_X(ST_Centroid(z.geom)) AS longitude
      FROM zone_indicators zi
      JOIN regions z ON z.id = zi.zone_id
      WHERE zi.zone_type = 'region'
      AND zi.risk_max IS NOT NULL
      AND zi.risk_max >= $1
      ORDER BY zi.risk_max DESC
      LIMIT $2
      `,
      [riskThreshold, limit],
    );

    const results: any[] = [];

    for (const zone of zones) {
      const latitude = Number(zone.latitude);
      const longitude = Number(zone.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      const result = await this.generateWeatherRiskAlert({
        latitude,
        longitude,
        zoneType: 'region',
        riskThreshold,
        rainfallThreshold,
        windThreshold,
      });

      results.push({
        zone: zone.zone_nom,
        result,
      });
    }

    return {
      message: 'Génération automatique météo-risque terminée.',
      checkedZones: zones.length,
      results,
    };
  }
}
