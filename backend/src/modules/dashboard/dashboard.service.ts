import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type RiskDistribution = {
  FAIBLE: number;
  MOYEN: number;
  ELEVE: number;
  CRITIQUE: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  private query(sql: string, params: unknown[] = []) {
    return this.dataSource.query(sql, params);
  }

  private emptyDistribution(): RiskDistribution {
    return {
      FAIBLE: 0,
      MOYEN: 0,
      ELEVE: 0,
      CRITIQUE: 0,
    };
  }

  async getSummary() {
    const [globalRisk] = await this.query(`
      SELECT
        AVG(latest.risk_mean) AS risk_mean_national,
        MAX(latest.risk_max) AS risk_max_national,
        SUM(latest.population_exposed) AS population_exposed
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
          f.risk_mean,
          f.risk_max,
          f.population_exposed
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt
          ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z
          ON z.zone_key = f.zone_key
        WHERE rt.risk_type = 'GLOBAL'
          AND z.zone_type = 'region'
        ORDER BY z.zone_id, rt.risk_type, f.operational_updated_at DESC NULLS LAST
      ) latest
    `);

    const [multiRisk] = await this.query(`
      SELECT
        COUNT(*) FILTER (WHERE latest.risk_level = 'CRITIQUE') AS critical_zones,
        COUNT(*) FILTER (WHERE latest.risk_level = 'ELEVE') AS high_zones,
        COUNT(*) FILTER (WHERE latest.risk_level IN ('ELEVE', 'CRITIQUE')) AS elevated_or_critical_zones,
        AVG(latest.risk_mean) AS multi_risk_mean,
        MAX(latest.risk_max) AS multi_risk_max
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
          f.risk_level,
          f.risk_mean,
          f.risk_max
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt
          ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z
          ON z.zone_key = f.zone_key
        WHERE z.zone_type = 'region'
        ORDER BY z.zone_id, rt.risk_type, f.operational_updated_at DESC NULLS LAST
      ) latest
    `);

    const [sourceStats] = await this.query(`
      SELECT
        COUNT(*) AS total_sources,
        COUNT(*) FILTER (WHERE status = 'CONNECTED') AS connected_sources,
        COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_sources,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_sources
      FROM data_sources
      WHERE is_active = true
    `);

    const [rasterStats] = await this.query(`
      SELECT
        COUNT(*) AS active_rasters,
        MAX(created_at) AS latest_raster_update
      FROM raster_layers
      WHERE is_active = true
    `);

    const [etlJob] = await this.query(`
      SELECT
        id,
        status,
        message,
        started_at,
        finished_at,
        duration_ms,
        updated_at
      FROM etl_pipeline_jobs
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const [alertStats] = await this.query(`
      SELECT
        COUNT(*) AS total_alerts,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_alerts,
        COUNT(*) FILTER (WHERE niveau = 'CRITIQUE' AND status = 'ACTIVE') AS critical_alerts
      FROM alertes
    `);

    return {
      riskMeanNational: Number(globalRisk?.risk_mean_national ?? 0),
      riskMaxNational: Number(globalRisk?.risk_max_national ?? 0),
      multiRiskMean: Number(multiRisk?.multi_risk_mean ?? 0),
      multiRiskMax: Number(multiRisk?.multi_risk_max ?? 0),
      criticalZones: Number(multiRisk?.critical_zones ?? 0),
      highZones: Number(multiRisk?.high_zones ?? 0),
      elevatedOrCriticalZones: Number(
        multiRisk?.elevated_or_critical_zones ?? 0,
      ),
      populationExposed: Number(globalRisk?.population_exposed ?? 0),
      connectedSources: Number(sourceStats?.connected_sources ?? 0),
      totalSources: Number(sourceStats?.total_sources ?? 0),
      failedSources: Number(sourceStats?.failed_sources ?? 0),
      pendingSources: Number(sourceStats?.pending_sources ?? 0),
      activeRasters: Number(rasterStats?.active_rasters ?? 0),
      latestRasterUpdate: rasterStats?.latest_raster_update ?? null,
      latestEtlJob: etlJob ?? null,
      activeAlerts: Number(alertStats?.active_alerts ?? 0),
      criticalAlerts: Number(alertStats?.critical_alerts ?? 0),
      totalAlerts: Number(alertStats?.total_alerts ?? 0),
      lastUpdate:
        etlJob?.finished_at ??
        rasterStats?.latest_raster_update ??
        null,
    };
  }

  async getTopRiskZones(limit = 10, riskType?: string, zoneType = 'region') {
    const params: unknown[] = [zoneType];
    const filters = ['z.zone_type = $1'];

    if (riskType) {
      params.push(riskType);
      filters.push(`rt.risk_type = $${params.length}`);
    }

    params.push(Math.min(Math.max(Number(limit) || 10, 1), 50));
    const limitParam = `$${params.length}`;

    return this.query(
      `
      SELECT *
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
          rt.risk_type AS "riskType",
          rt.label AS "riskLabel",
          z.zone_type AS "zoneType",
          z.zone_id AS "zoneId",
          z.zone_code AS "zoneCode",
          z.zone_nom AS "zoneNom",
          f.population_exposed AS "populationExposed",
          f.area_km2 AS "areaKm2",
          f.risk_mean AS "riskMean",
          f.risk_max AS "riskMax",
          f.hazard_mean AS "hazardMean",
          f.risk_level AS "riskLevel",
          f.operational_updated_at AS "updatedAt"
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt
          ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z
          ON z.zone_key = f.zone_key
        WHERE ${filters.join(' AND ')}
          AND f.risk_max IS NOT NULL
        ORDER BY z.zone_id, rt.risk_type, f.operational_updated_at DESC NULLS LAST
      ) latest
      ORDER BY "riskMax" DESC NULLS LAST
      LIMIT ${limitParam}
      `,
      params,
    );
  }

  async getRiskDistribution(riskType?: string, zoneType = 'region') {
    const params: unknown[] = [zoneType];
    const filters = ['z.zone_type = $1'];

    if (riskType) {
      params.push(riskType);
      filters.push(`rt.risk_type = $${params.length}`);
    }

    const rows = await this.query(
      `
      SELECT
        latest.risk_level AS level,
        COUNT(*) AS count
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
          f.risk_level
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt
          ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z
          ON z.zone_key = f.zone_key
        WHERE ${filters.join(' AND ')}
          AND f.risk_level IS NOT NULL
        ORDER BY z.zone_id, rt.risk_type, f.operational_updated_at DESC NULLS LAST
      ) latest
      GROUP BY latest.risk_level
      `,
      params,
    );

    const distribution = this.emptyDistribution();

    for (const row of rows) {
      if (row.level in distribution) {
        distribution[row.level as keyof RiskDistribution] = Number(row.count);
      }
    }

    return distribution;
  }

  async getRiskByRegion() {
    const rows = await this.query(`
      SELECT
        latest.zone_id AS "zoneId",
        latest.zone_nom AS "zoneNom",
        latest.risk_type AS "riskType",
        latest.risk_mean AS "riskMean",
        latest.risk_max AS "riskMax",
        latest.risk_level AS "riskLevel"
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
          z.zone_id,
          z.zone_nom,
          rt.risk_type,
          f.risk_mean,
          f.risk_max,
          f.risk_level
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt
          ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z
          ON z.zone_key = f.zone_key
        WHERE z.zone_type = 'region'
        ORDER BY z.zone_id, rt.risk_type, f.operational_updated_at DESC NULLS LAST
      ) latest
      ORDER BY
        latest.zone_nom,
        latest.risk_type
    `);

    const grouped = new Map<string, any>();

    for (const row of rows) {
      const key = row.zoneId;

      if (!grouped.has(key)) {
        grouped.set(key, {
          zoneId: row.zoneId,
          zoneNom: row.zoneNom,
          risks: {},
        });
      }

      grouped.get(key).risks[row.riskType] = {
        riskMean:
          row.riskMean !== null && row.riskMean !== undefined
            ? Number(row.riskMean)
            : null,
        riskMax:
          row.riskMax !== null && row.riskMax !== undefined
            ? Number(row.riskMax)
            : null,
        riskLevel: row.riskLevel ?? null,
      };
    }

    return Array.from(grouped.values());
  }

  async getDataSources() {
    return this.query(`
      SELECT
        code,
        name,
        category::text AS category,
        provider,
        status::text AS status,
        last_sync_at AS "lastSyncAt",
        last_success_at AS "lastSuccessAt",
        last_error_at AS "lastErrorAt",
        last_error_message AS "lastErrorMessage"
      FROM data_sources
      WHERE is_active = true
      ORDER BY category, name
    `);
  }

  async getLatestEtlJobs(limit = 5) {
    return this.query(
      `
      SELECT
        id,
        type,
        status,
        message,
        started_at AS "startedAt",
        finished_at AS "finishedAt",
        duration_ms AS "durationMs",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM etl_pipeline_jobs
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [Math.min(Math.max(Number(limit) || 5, 1), 20)],
    );
  }

  async getRasterSummary() {
    return this.query(`
      SELECT
        type::text AS type,
        name,
        file_path AS "filePath",
        min_value AS "minValue",
        max_value AS "maxValue",
        mean_value AS "meanValue",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM raster_layers
      WHERE is_active = true
      ORDER BY created_at DESC
    `);
  }

  async getClimateIndicators() {
    const [latestNasaDate] = await this.query(`
      SELECT MAX(observed_date) AS latest_date
      FROM climate_observations
      WHERE source = 'NASA_POWER'
        AND (
          temperature_mean IS NOT NULL
          OR humidity_mean IS NOT NULL
          OR wind_speed_mean IS NOT NULL
          OR precipitation IS NOT NULL
        )
`);

    const latestDate = latestNasaDate?.latest_date;

    if (!latestDate) {
      return {
        date: null,
        temperature: {
          label: 'Température moyenne',
          value: null,
          unit: '°C',
          source: 'NASA POWER',
        },
        humidity: {
          label: 'Humidité moyenne',
          value: null,
          unit: '%',
          source: 'NASA POWER',
        },
        wind: {
          label: 'Vitesse du vent moyenne',
          value: null,
          unit: 'm/s',
          source: 'NASA POWER',
        },
        precipitation: {
          label: 'Précipitations moyennes',
          value: null,
          unit: 'mm',
          source: 'NASA POWER',
        },
      };
    }

    const [stats] = await this.query(
      `
      SELECT
        AVG(temperature_mean) AS temperature_mean,
        AVG(humidity_mean) AS humidity_mean,
        AVG(wind_speed_mean) AS wind_speed_mean,
        AVG(precipitation) AS precipitation
      FROM climate_observations
      WHERE source = 'NASA_POWER'
        AND observed_date = $1
      `,
      [latestDate],
    );

    return {
      date: latestDate,
      temperature: {
        label: 'Température moyenne',
        value:
          stats?.temperature_mean !== null &&
          stats?.temperature_mean !== undefined
            ? Number(stats.temperature_mean)
            : null,
        unit: '°C',
        source: 'NASA POWER',
      },
      humidity: {
        label: 'Humidité moyenne',
        value:
          stats?.humidity_mean !== null && stats?.humidity_mean !== undefined
            ? Number(stats.humidity_mean)
            : null,
        unit: '%',
        source: 'NASA POWER',
      },
      wind: {
        label: 'Vitesse du vent moyenne',
        value:
          stats?.wind_speed_mean !== null &&
          stats?.wind_speed_mean !== undefined
            ? Number(stats.wind_speed_mean)
            : null,
        unit: 'm/s',
        source: 'NASA POWER',
      },
      precipitation: {
        label: 'Précipitations moyennes',
        value:
          stats?.precipitation !== null && stats?.precipitation !== undefined
            ? Number(stats.precipitation)
            : null,
        unit: 'mm',
        source: 'NASA POWER',
      },
    };
  }
}
