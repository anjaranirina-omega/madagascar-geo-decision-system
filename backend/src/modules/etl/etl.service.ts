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
import { DataSourcesService } from '../data-sources/data-sources.service';
import { DataSourceCode } from '../data-sources/entities/data-source-status.entity';

const execFileAsync = promisify(execFile);

export type EtlPipelineStep = {
  name: string;
  script: string;
  args?: string[];
};

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);

  constructor(
    private readonly alertesService: AlertesService,
    private readonly dataSourcesService: DataSourcesService,
  ) {}

  private getProjectRoot() {
    return resolve(process.cwd(), '..');
  }

  private getEtlDir() {
    return join(this.getProjectRoot(), 'etl');
  }

  private getPythonBin() {
    const etlDir = this.getEtlDir();
    const venvPython = join(etlDir, '.venv', 'bin', 'python');

    return process.env.PYTHON_BIN ?? (existsSync(venvPython) ? venvPython : 'python3');
  }

  private getBackendApiUrl() {
    const backendPort = process.env.BACKEND_PORT ?? 3001;

    return process.env.BACKEND_API_URL ?? `http://localhost:${backendPort}/api`;
  }

  private assertRequiredEtlFile(relativePath: string, label: string) {
    const fullPath = join(this.getEtlDir(), relativePath);

    if (!existsSync(fullPath)) {
      throw new InternalServerErrorException({
        message: `Fichier requis absent : ${label}`,
        detail: `Le fichier ${relativePath} est introuvable. Exécute d'abord le pipeline de préparation correspondant.`,
        missingFile: relativePath,
      });
    }
  }

  private shouldGenerateAlertsFromPipeline() {
    return process.env.ETL_PIPELINE_GENERATE_ALERTS === 'true';
  }

  private async updateDataSourceStatusAfterStep(
    step: EtlPipelineStep,
    result: { status: string; error?: string },
  ) {
    const stepSources: Record<string, DataSourceCode[]> = {
      'Synchronisation CHIRPS latest': [DataSourceCode.CHIRPS],
      'Masquage des rasters normalisés': [
        DataSourceCode.CHIRPS,
        DataSourceCode.COPERNICUS_DEM,
        DataSourceCode.WORLDPOP,
        DataSourceCode.ESA_WORLDCOVER,
        DataSourceCode.HYDRORIVERS,
      ],
      'Recalcul du raster de risque global': [
        DataSourceCode.CHIRPS,
        DataSourceCode.COPERNICUS_DEM,
        DataSourceCode.WORLDPOP,
        DataSourceCode.ESA_WORLDCOVER,
      ],
      'Recalcul du raster de risque inondation': [
        DataSourceCode.CHIRPS,
        DataSourceCode.COPERNICUS_DEM,
        DataSourceCode.WORLDPOP,
        DataSourceCode.ESA_WORLDCOVER,
        DataSourceCode.HYDRORIVERS,
      ],
      'Recalcul du raster de risque sécheresse': [
        DataSourceCode.CHIRPS,
        DataSourceCode.NASA_POWER,
        DataSourceCode.WORLDPOP,
        DataSourceCode.ESA_WORLDCOVER,
      ],
      'Recalcul du raster de risque glissement de terrain': [
        DataSourceCode.CHIRPS,
        DataSourceCode.COPERNICUS_DEM,
        DataSourceCode.WORLDPOP,
        DataSourceCode.ESA_WORLDCOVER,
      ],
    };

    const sources = stepSources[step.name] ?? [];

    for (const source of sources) {
      try {
        if (result.status === 'SUCCESS') {
          await this.dataSourcesService.markSuccess(source, {
            lastPipelineStep: step.name,
          });
        } else {
          await this.dataSourcesService.markFailed(
            source,
            result.error ?? `Échec de l'étape ETL : ${step.name}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Impossible de mettre à jour le statut de la source ${source}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
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

      if (stderr?.trim()) {
        this.logger.warn(`ETL stderr ${step.name}: ${stderr.slice(-2000)}`);
      }

      if (stdout?.trim()) {
        this.logger.log(`ETL stdout ${step.name}: ${stdout.slice(-2000)}`);
      }

      return {
        name: step.name,
        script: step.script,
        status: 'SUCCESS',
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      this.logger.error(`ETL step failed: ${step.name}`, error as Error);

      return {
        name: step.name,
        script: step.script,
        status: 'FAILED',
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async runRiskPipeline() {
    /*
     * Vérifications préalables.
     *
     * river_proximity_norm.tif est une donnée hydrographique semi-statique.
     * Elle ne doit pas être recalculée à chaque pipeline automatique, car elle
     * dépend de HydroRIVERS/HydroSHEDS et peut être lourde à produire.
     */
    this.assertRequiredEtlFile(
      'data/raster/normalized/river_proximity_norm.tif',
      'Proximité aux rivières HydroRIVERS',
    );

    this.assertRequiredEtlFile(
      'data/raster/normalized/slope_norm.tif',
      'Pente normalisée Copernicus DEM',
    );

    this.assertRequiredEtlFile(
      'data/raster/normalized/population_norm.tif',
      'Population normalisée WorldPop',
    );

    this.assertRequiredEtlFile(
      'data/raster/normalized/landcover_norm.tif',
      'Occupation du sol normalisée ESA WorldCover',
    );

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
        name: 'Recalcul du raster de risque global',
        script: 'raster/weighted_overlay.py',
      },
      {
        name: 'Masquage du raster de risque global',
        script: 'raster/mask_rasters_to_madagascar.py',
        args: ['--scope', 'risk'],
      },
      {
        name: 'Recalcul du raster de risque inondation',
        script: 'raster/risks/flood/compute_flood_risk.py',
      },
      {
        name: 'Masquage des rasters de risque inondation',
        script: 'raster/mask_rasters_to_madagascar.py',
        args: ['--scope', 'flood'],
      },
      {
        name: 'Recalcul du raster de risque sécheresse',
        script: 'raster/risks/drought/compute_drought_risk.py',
      },
      {
        name: 'Masquage des rasters de risque sécheresse',
        script: 'raster/mask_rasters_to_madagascar.py',
        args: ['--scope', 'drought'],
      },
      {
        name: 'Recalcul du raster de risque glissement de terrain',
        script: 'raster/risks/landslide/compute_landslide_risk.py',
      },
      {
        name: 'Masquage des rasters de risque glissement de terrain',
        script: 'raster/mask_rasters_to_madagascar.py',
        args: ['--scope', 'landslide'],
      },
      {
        name: 'Enregistrement des métadonnées raster',
        script: 'raster/register_raster_metadata.py',
      },
      {
        name: 'Calcul des statistiques zonales globales',
        script: 'raster/zonal/compute_zone_indicators.py',
      },
      {
        name: 'Calcul des statistiques zonales inondation',
        script: 'raster/zonal/compute_flood_zone_indicators.py',
      },
      {
        name: 'Calcul des statistiques zonales sécheresse',
        script: 'raster/zonal/compute_drought_zone_indicators.py',
      },
    ];

    const results = [];

    for (const step of steps) {
      const result = await this.runPythonStep(step);

      results.push(result);

      await this.updateDataSourceStatusAfterStep(step, result);

      if (result.status === 'FAILED') {
        throw new InternalServerErrorException({
          message: `Pipeline arrêté à l’étape : ${step.name}`,
          results,
        });
      }
    }

    let alertResult: unknown = null;
    let alertWarning: string | null = null;
    let alertSkipped = true;

    /*
     * Les alertes ne sont PAS générées par défaut.
     *
     * Cela évite de produire des alertes spécifiques ou météo-risque tant que
     * les modèles de risque et les statistiques zonales spécifiques ne sont pas
     * entièrement validés.
     *
     * Pour réactiver plus tard :
     * ETL_PIPELINE_GENERATE_ALERTS=true
     */
    if (this.shouldGenerateAlertsFromPipeline()) {
      alertSkipped = false;

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
    }

    return {
      message:
        'Pipeline de risque exécuté avec succès : risques global, inondation, sécheresse, glissement de terrain et indicateurs zonaux recalculés.',
      steps: results,
      alertes: alertResult,
      alertWarning,
      alertSkipped,
    };
  }
}
