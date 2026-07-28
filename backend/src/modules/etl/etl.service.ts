import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { AlertesService } from '../alertes/alertes.service';

const execFileAsync = promisify(execFile);

export type EtlPipelineStep = {
  name: string;
  script: string;
  args?: string[];
};

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);

  constructor(private readonly alertesService: AlertesService) {}

  private getProjectRoot() {
    return resolve(process.cwd(), '..');
  }

  private getEtlDir() {
    return join(this.getProjectRoot(), 'etl');
  }

  private getPythonBin() {
    const etlDir = this.getEtlDir();
    const venvPython = join(etlDir, '.venv', 'bin', 'python');

    return process.env.PYTHON_BIN ??
      (existsSync(venvPython) ? venvPython : 'python3');
  }

  private getBackendApiUrl() {
    const backendPort = process.env.BACKEND_PORT ?? 3001;
    return process.env.BACKEND_API_URL ?? `http://localhost:${backendPort}/api`;
  }

  private async runPythonStep(step: EtlPipelineStep) {
    const pythonBin = this.getPythonBin();
    const etlDir = this.getEtlDir();

    const args = [step.script, ...(step.args ?? [])];

    const env = {
      ...process.env,
      BACKEND_API_URL: this.getBackendApiUrl(),
    };

    this.logger.log(`ETL step start: ${step.name}`);

    const startedAt = Date.now();

    try {
      const { stdout, stderr } = await execFileAsync(pythonBin, args, {
        cwd: etlDir,
        env,
        timeout: 30 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 50,
      });

      const durationMs = Date.now() - startedAt;

      this.logger.log(`ETL step done: ${step.name} (${durationMs}ms)`);

      return {
        name: step.name,
        script: step.script,
        status: 'SUCCESS',
        durationMs,
        stdout,
        stderr,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      this.logger.error(`ETL step failed: ${step.name}`, error as Error);

      return {
        name: step.name,
        script: step.script,
        status: 'FAILED',
        durationMs,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async runRiskPipeline() {
    const steps: EtlPipelineStep[] = [
      {
        name: 'Synchronisation CHIRPS latest',
        script: 'raster/chirps/fetch_latest_chirps.py',
      },
      {
        name: 'Masquage des rasters normalisés',
        script: 'raster/mask_rasters_to_madagascar.py',
        args: ['--scope', 'normalized'],
      },
      {
        name: 'Recalcul du raster de risque',
        script: 'raster/weighted_overlay.py',
      },
      {
        name: 'Masquage du raster de risque',
        script: 'raster/mask_rasters_to_madagascar.py',
        args: ['--scope', 'risk'],
      },
      {
        name: 'Enregistrement des métadonnées raster',
        script: 'raster/register_raster_metadata.py',
      },
      {
        name: 'Calcul des statistiques zonales',
        script: 'raster/zonal/compute_zone_indicators.py',
      },
    ];

    const results = [];

    for (const step of steps) {
      const result = await this.runPythonStep(step);
      results.push(result);

      if (result.status === 'FAILED') {
        throw new InternalServerErrorException({
          message: `Pipeline arrêté à l’étape : ${step.name}`,
          results,
        });
      }
    }

    let alertResult: unknown = null;
    let alertWarning: string | null = null;

    try {
      alertResult = await this.alertesService.autoGenerateWeatherRiskAlerts();
    } catch (error) {
      alertWarning =
        error instanceof Error
          ? error.message
          : 'Erreur inconnue pendant la génération automatique des alertes.';

      this.logger.warn(
        `Pipeline terminé, mais génération météo-risque échouée : ${alertWarning}`,
      );
    }

    return {
      message: 'Pipeline de risque exécuté avec succès.',
      steps: results,
      alertes: alertResult,
      alertWarning,
    };
  }
}
