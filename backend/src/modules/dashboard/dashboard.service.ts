import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  private query(sql: string, params: unknown[] = []) {
    return this.dataSource.query(sql, params);
  }

  async getSummary() {
    const [riskStats] = await this.query(`
      SELECT
        AVG(risk_mean) AS risk_mean_national,
        COUNT(*) FILTER (WHERE risk_level = 'CRITIQUE') AS critical_zones,
        COUNT(*) FILTER (WHERE risk_level = 'ELEVE') AS high_zones
      FROM zone_indicators
      WHERE zone_type = 'region'
    `);

    const [alertStats] = await this.query(`
      SELECT
        COUNT(*) AS total_alerts,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_alerts,
        COUNT(*) FILTER (WHERE niveau = 'CRITIQUE' AND status = 'ACTIVE') AS critical_alerts
      FROM alertes
    `);

    const [lastRaster] = await this.query(`
      SELECT updated_at
      FROM raster_layers
      WHERE type = 'RISK_INDEX'
      AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    return {
      riskMeanNational: Number(riskStats?.risk_mean_national ?? 0),
      criticalZones: Number(riskStats?.critical_zones ?? 0),
      highZones: Number(riskStats?.high_zones ?? 0),
      activeAlerts: Number(alertStats?.active_alerts ?? 0),
      criticalAlerts: Number(alertStats?.critical_alerts ?? 0),
      totalAlerts: Number(alertStats?.total_alerts ?? 0),
      lastUpdate: lastRaster?.updated_at ?? null,
    };
  }

  async getTopRiskZones(limit = 5) {
    return this.query(
      `
      SELECT
        zone_type AS "zoneType",
        zone_id AS "zoneId",
        zone_nom AS "zoneNom",
        population_exposed AS "populationExposed",
        area_km2 AS "areaKm2",
        risk_mean AS "riskMean",
        risk_max AS "riskMax",
        risk_level AS "riskLevel",
        updated_at AS "updatedAt"
      FROM zone_indicators
      WHERE zone_type = 'region'
      AND risk_max IS NOT NULL
      ORDER BY risk_max DESC
      LIMIT $1
      `,
      [limit],
    );
  }

  async getRiskDistribution() {
    const rows = await this.query(`
      SELECT
        risk_level AS level,
        COUNT(*) AS count
      FROM zone_indicators
      WHERE zone_type = 'region'
      AND risk_level IS NOT NULL
      GROUP BY risk_level
    `);

    const distribution: Record<string, number> = {
      FAIBLE: 0,
      MOYEN: 0,
      ELEVE: 0,
      CRITIQUE: 0,
    };

    for (const row of rows) {
      distribution[row.level] = Number(row.count);
    }

    return distribution;
  }

  async getAlertsSummary() {
    const [stats] = await this.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
        COUNT(*) FILTER (WHERE status = 'RESOLUE') AS resolved,
        COUNT(*) FILTER (WHERE status = 'IGNOREE') AS ignored,
        COUNT(*) FILTER (WHERE niveau = 'CRITIQUE') AS critical,
        COUNT(*) FILTER (WHERE niveau = 'ELEVE') AS high
      FROM alertes
    `);

    return {
      total: Number(stats?.total ?? 0),
      active: Number(stats?.active ?? 0),
      resolved: Number(stats?.resolved ?? 0),
      ignored: Number(stats?.ignored ?? 0),
      critical: Number(stats?.critical ?? 0),
      high: Number(stats?.high ?? 0),
    };
  }

  async getClimateIndicators() {
    return {
      rainfall: {
        label: 'Précipitations',
        value: 45.2,
        unit: 'mm',
        source: 'CHIRPS',
      },
      temperature: {
        label: 'Température',
        value: 27.6,
        unit: '°C',
        source: 'NASA POWER à venir',
      },
      humidity: {
        label: 'Humidité',
        value: 78,
        unit: '%',
        source: 'NASA POWER à venir',
      },
      wind: {
        label: 'Vitesse du vent',
        value: 12.4,
        unit: 'km/h',
        source: 'OpenWeather à venir',
      },
    };
  }
}
