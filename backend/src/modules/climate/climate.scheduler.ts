import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ClimateSyncService } from './climate-sync.service';

@Injectable()
export class ClimateScheduler {
  private readonly logger = new Logger(ClimateScheduler.name);

  constructor(private readonly climateSyncService: ClimateSyncService) {}

  /**
   * Synchronisation planifiée NASA POWER.
   *
   * Par défaut : tous les jours à 02:30.
   *
   * Activation via :
   * NASA_POWER_AUTO_ENABLED=true
   *
   * Remarque :
   * Le cron est fixe ici car @Cron ne lit pas dynamiquement .env dans son décorateur.
   * La variable NASA_POWER_CRON est documentée pour évolution future.
   */
  @Cron('0 30 2 * * *')
  async handleNasaPowerCron() {
    if (process.env.NASA_POWER_AUTO_ENABLED !== 'true') {
      return;
    }

    this.logger.log('Démarrage automatique NASA POWER');

    try {
      const result = await this.climateSyncService.syncNasaPowerRegions();

      this.logger.log(
        `Synchronisation NASA POWER automatique terminée : ${JSON.stringify({
          status: result.status,
          durationMs: result.durationMs,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        'Erreur pendant la synchronisation automatique NASA POWER',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
