import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SettingsService {
  constructor(private readonly dataSource: DataSource) {}

  private isConfigured(value?: string) {
    return Boolean(value && value !== 'replace_me' && value !== 'change_me');
  }

  async getSummary() {
    const sources = await this.dataSource.query(`
      SELECT
        code,
        name,
        category::text AS category,
        provider,
        status::text AS status,
        last_sync_at AS "lastSyncAt",
        last_success_at AS "lastSuccessAt",
        last_error_at AS "lastErrorAt",
        last_error_message AS "lastErrorMessage",
        metadata
      FROM data_sources
      WHERE is_active = true
      ORDER BY category, name
    `);

    const [latestEtlJob] = await this.dataSource.query(`
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
      LIMIT 1
    `);

    const [rasterStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS "activeRasters",
        MAX(created_at) AS "latestRasterUpdate"
      FROM raster_layers
      WHERE is_active = true
    `);

    const [weatherStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE zone_type = 'region') AS "regionalWeatherCount",
        COUNT(DISTINCT zone_id) FILTER (WHERE zone_type = 'region') AS "regionalWeatherZones",
        MAX(observed_at) AS "latestWeatherAt"
      FROM weather_observations
      WHERE source = 'OPENWEATHER'
    `);

    const [alertStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS "totalAlerts",
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS "activeAlerts",
        COUNT(*) FILTER (WHERE niveau = 'CRITIQUE' AND status = 'ACTIVE') AS "criticalAlerts"
      FROM alertes
    `);

    const connectedSources = sources.filter(
      (source: Record<string, unknown>) => source.status === 'CONNECTED',
    ).length;

    const failedSources = sources.filter(
      (source: Record<string, unknown>) => source.status === 'FAILED',
    ).length;

    const pendingSources = sources.filter(
      (source: Record<string, unknown>) => source.status === 'PENDING',
    ).length;

    return {
      application: {
        name: 'RISKCLIM-MG',
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.APP_VERSION ?? '1.0.0',
      },

      platformHealth: {
        sourcesTotal: sources.length,
        connectedSources,
        failedSources,
        pendingSources,
        activeRasters: Number(rasterStats?.activeRasters ?? 0),
        latestRasterUpdate: rasterStats?.latestRasterUpdate ?? null,
        latestEtlJob: latestEtlJob ?? null,
        activeAlerts: Number(alertStats?.activeAlerts ?? 0),
        criticalAlerts: Number(alertStats?.criticalAlerts ?? 0),
        latestWeatherAt: weatherStats?.latestWeatherAt ?? null,
        regionalWeatherZones: Number(weatherStats?.regionalWeatherZones ?? 0),
      },

      sources,

      pipelines: {
        riskPipelineAutoEnabled:
          process.env.RISK_PIPELINE_AUTO_ENABLED === 'true',
        riskPipelineCron: process.env.RISK_PIPELINE_CRON ?? '0 0 */6 * * *',
        etlPipelineGenerateAlerts:
          process.env.ETL_PIPELINE_GENERATE_ALERTS === 'true',
        nasaPowerAutoEnabled: process.env.NASA_POWER_AUTO_ENABLED === 'true',
        nasaPowerCron: process.env.NASA_POWER_CRON ?? '0 30 2 * * *',
      },

      realtimeWeather: {
        openWeatherConfigured: this.isConfigured(
          process.env.OPENWEATHER_API_KEY,
        ),
        realtimeWeatherEnabled:
          process.env.REALTIME_WEATHER_ENABLED === 'true',
        realtimeWeatherCron:
          process.env.REALTIME_WEATHER_CRON ?? '0 */30 * * * *',
        zoneLevel: process.env.REALTIME_WEATHER_ZONE_LEVEL ?? 'region',
        regionalWeatherCount: Number(weatherStats?.regionalWeatherCount ?? 0),
        regionalWeatherZones: Number(weatherStats?.regionalWeatherZones ?? 0),
        latestWeatherAt: weatherStats?.latestWeatherAt ?? null,
      },

      alerts: {
        validatedAlertsAfterPipeline:
          process.env.VALIDATED_ALERTS_AFTER_PIPELINE !== 'false',
        validatedAlertZoneType:
          process.env.VALIDATED_ALERT_ZONE_TYPE ?? 'region',
        validatedAlertRiskMeanThreshold: Number(
          process.env.VALIDATED_ALERT_RISK_MEAN_THRESHOLD ?? 60,
        ),
        validatedAlertRiskMaxThreshold: Number(
          process.env.VALIDATED_ALERT_RISK_MAX_THRESHOLD ?? 70,
        ),
        validatedAlertZoneLimit: Number(
          process.env.VALIDATED_ALERT_ZONE_LIMIT ?? 10,
        ),
        legacyAutoAlertsEnabled: process.env.AUTO_ALERTS_ENABLED === 'true',
      },

      security: {
        jwtConfigured: this.isConfigured(process.env.JWT_SECRET),
        smtpConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
        adminContactConfigured: Boolean(process.env.ADMIN_CONTACT_EMAIL),
      },

      externalApiConfiguration: {
        openWeatherApiKeyConfigured: this.isConfigured(
          process.env.OPENWEATHER_API_KEY,
        ),
        openTopographyApiKeyConfigured: this.isConfigured(
          process.env.OPENTOPOGRAPHY_API_KEY,
        ),
        nasaPowerConfigured: this.isConfigured(process.env.NASA_POWER_BASE_URL),
        ibtracsConfigured: this.isConfigured(process.env.IBTRACS_SI_URL),
      },
    };
  }
}
