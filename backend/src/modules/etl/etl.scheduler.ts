import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EtlService } from './etl.service';

@Injectable()
export class EtlScheduler {
  private readonly logger = new Logger(EtlScheduler.name);
  private running = false;

  constructor(private readonly etlService: EtlService) {}

  /**
   * Exécution planifiée du pipeline de risque.
   *
   * Par défaut : toutes les 6 heures.
   * Activation via :
   * RISK_PIPELINE_AUTO_ENABLED=true
   *
   * Remarque :
   * Le cron est fixe ici car @Cron ne lit pas dynamiquement .env dans son décorateur.
   * La variable RISK_PIPELINE_CRON est documentée pour évolution future.
   */
  @Cron('0 0 */6 * * *')
  async handleRiskPipelineCron() {
    if (process.env.RISK_PIPELINE_AUTO_ENABLED !== 'true') {
      return;
    }

    if (this.running) {
      this.logger.warn(
        'Pipeline de risque déjà en cours. Nouvelle exécution ignorée.',
      );
      return;
    }

    this.running = true;

    this.logger.log('Démarrage automatique du pipeline de risque');

    try {
      const result = await this.etlService.runRiskPipeline();

      this.logger.log(
        `Pipeline automatique terminé : ${JSON.stringify({
          steps: result.steps?.length,
          alertWarning: result.alertWarning,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        'Erreur pendant le pipeline automatique de risque',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
