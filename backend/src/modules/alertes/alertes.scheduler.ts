import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertesService } from './alertes.service';
import { OperationalSignalsService } from '../operational-signals/operational-signals.service';

@Injectable()
export class AlertesScheduler {
  private readonly logger = new Logger(AlertesScheduler.name);

  constructor(
    private readonly alertesService: AlertesService,
    private readonly operationalSignalsService: OperationalSignalsService,
  ) {}

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

  /**
   * Alertes opérationnelles : recalcul des signaux puis génération des alertes.
   * Exécution quotidienne à 05:10, après la synchronisation météo.
   */
  @Cron('0 10 5 * * *')
  async handleDailyOperationalAlerts() {
    if (process.env.AUTO_ALERTS_ENABLED !== 'true') {
      return;
    }

    try {
      await this.operationalSignalsService.recompute('region');
      const result = await this.alertesService.generateOperationalAlerts({});
      this.logger.log(
        `Alertes opérationnelles : ${result.created?.length ?? 0} créée(s), ${
          result.updated?.length ?? 0
        } mise(s) à jour`,
      );
    } catch (error) {
      this.logger.error(
        'Erreur génération automatique des alertes opérationnelles',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
