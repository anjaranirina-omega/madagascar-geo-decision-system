import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertesService } from './alertes.service';

@Injectable()
export class AlertesScheduler {
  private readonly logger = new Logger(AlertesScheduler.name);

  constructor(private readonly alertesService: AlertesService) {}

  /**
   * Exécution automatique toutes les heures.
   *
   * Format cron :
   * seconde minute heure jour mois jourSemaine
   */
  @Cron('0 0 * * * *')
  async handleHourlyWeatherRiskAlerts() {
    if (process.env.AUTO_ALERTS_ENABLED !== 'true') {
      return;
    }

    this.logger.log('Début génération automatique des alertes météo-risque');

    try {
      const result =
        await this.alertesService.autoGenerateWeatherRiskAlerts();

      this.logger.log(
        `Génération terminée : ${JSON.stringify({
          checkedZones: result.checkedZones,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        'Erreur génération automatique des alertes météo-risque',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
