import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MeteoService } from './meteo.service';

@Injectable()
export class MeteoScheduler {
  private readonly logger = new Logger(MeteoScheduler.name);
  private running = false;

  constructor(private readonly meteoService: MeteoService) {}

  /**
   * Synchronisation météo temps réel.
   *
   * Par défaut : toutes les 30 minutes.
   * Activation via :
   * REALTIME_WEATHER_ENABLED=true
   */
  @Cron('0 */30 * * * *')
  async handleRealtimeWeatherSync() {
    if (process.env.REALTIME_WEATHER_ENABLED !== 'true') {
      return;
    }

    if (this.running) {
      this.logger.warn('Synchronisation météo déjà en cours. Ignorée.');
      return;
    }

    this.running = true;

    this.logger.log('Démarrage synchronisation météo régionale OpenWeather');

    try {
      const result = await this.meteoService.syncRegionsWeather();

      this.logger.log(
        `Synchronisation météo terminée : ${JSON.stringify({
          successCount: result.successCount,
          failedCount: result.failedCount,
          durationMs: result.durationMs,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        'Erreur synchronisation météo régionale',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
