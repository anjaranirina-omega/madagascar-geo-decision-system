import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { promisify } from 'util';
import { UpdateCriteriaWeightsDto } from './dto/update-criteria-weights.dto';
import { UpdateRiskModelWeightsDto } from './dto/update-risk-model-weights.dto';
import {
  CriteriaWeight,
  RiskCriterionCode,
} from './entities/criteria-weight.entity';
import {
  RiskModelPart,
  RiskModelWeight,
  SpecificRiskType,
} from './entities/risk-model-weight.entity';

const execFileAsync = promisify(execFile);

const DEFAULT_WEIGHTS = [
  {
    criterionCode: RiskCriterionCode.RAINFALL,
    label: 'Précipitations',
    weight: 0.35,
  },
  {
    criterionCode: RiskCriterionCode.SLOPE,
    label: 'Pente',
    weight: 0.25,
  },
  {
    criterionCode: RiskCriterionCode.POPULATION,
    label: 'Population',
    weight: 0.25,
  },
  {
    criterionCode: RiskCriterionCode.LANDCOVER,
    label: 'Occupation du sol',
    weight: 0.15,
  },
];

const DEFAULT_RISK_MODEL_WEIGHTS = [
  // FLOOD
  { riskType: SpecificRiskType.FLOOD, modelPart: RiskModelPart.HAZARD, criterion: 'rainfall', label: 'Précipitations CHIRPS', weight: 0.40 },
  { riskType: SpecificRiskType.FLOOD, modelPart: RiskModelPart.HAZARD, criterion: 'inverse_slope', label: 'Pente inversée', weight: 0.25 },
  { riskType: SpecificRiskType.FLOOD, modelPart: RiskModelPart.HAZARD, criterion: 'river_proximity', label: 'Proximité rivière HydroRIVERS', weight: 0.35 },
  { riskType: SpecificRiskType.FLOOD, modelPart: RiskModelPart.RISK, criterion: 'hazard', label: 'Aléa inondation', weight: 0.65 },
  { riskType: SpecificRiskType.FLOOD, modelPart: RiskModelPart.RISK, criterion: 'population', label: 'Population exposée', weight: 0.20 },
  { riskType: SpecificRiskType.FLOOD, modelPart: RiskModelPart.RISK, criterion: 'landcover', label: 'Occupation du sol', weight: 0.15 },

  // DROUGHT
  { riskType: SpecificRiskType.DROUGHT, modelPart: RiskModelPart.HAZARD, criterion: 'rainfall_deficit', label: 'Déficit pluviométrique', weight: 0.55 },
  { riskType: SpecificRiskType.DROUGHT, modelPart: RiskModelPart.HAZARD, criterion: 'temperature_stress', label: 'Stress thermique', weight: 0.30 },
  { riskType: SpecificRiskType.DROUGHT, modelPart: RiskModelPart.HAZARD, criterion: 'landcover_sensitivity', label: 'Sensibilité occupation du sol', weight: 0.15 },
  { riskType: SpecificRiskType.DROUGHT, modelPart: RiskModelPart.RISK, criterion: 'hazard', label: 'Aléa sécheresse', weight: 0.70 },
  { riskType: SpecificRiskType.DROUGHT, modelPart: RiskModelPart.RISK, criterion: 'population', label: 'Population exposée', weight: 0.20 },
  { riskType: SpecificRiskType.DROUGHT, modelPart: RiskModelPart.RISK, criterion: 'landcover_sensitivity', label: 'Sensibilité occupation du sol', weight: 0.10 },

  // LANDSLIDE
  { riskType: SpecificRiskType.LANDSLIDE, modelPart: RiskModelPart.HAZARD, criterion: 'slope', label: 'Pente Copernicus DEM', weight: 0.45 },
  { riskType: SpecificRiskType.LANDSLIDE, modelPart: RiskModelPart.HAZARD, criterion: 'rainfall', label: 'Précipitations CHIRPS', weight: 0.35 },
  { riskType: SpecificRiskType.LANDSLIDE, modelPart: RiskModelPart.HAZARD, criterion: 'landcover_sensitivity', label: 'Sensibilité occupation du sol', weight: 0.20 },
  { riskType: SpecificRiskType.LANDSLIDE, modelPart: RiskModelPart.RISK, criterion: 'hazard', label: 'Aléa glissement', weight: 0.70 },
  { riskType: SpecificRiskType.LANDSLIDE, modelPart: RiskModelPart.RISK, criterion: 'population', label: 'Population exposée', weight: 0.20 },
  { riskType: SpecificRiskType.LANDSLIDE, modelPart: RiskModelPart.RISK, criterion: 'landcover_sensitivity', label: 'Sensibilité occupation du sol', weight: 0.10 },

  // CYCLONE
  { riskType: SpecificRiskType.CYCLONE, modelPart: RiskModelPart.HAZARD, criterion: 'track_hazard', label: 'Aléa historique IBTrACS', weight: 0.75 },
  { riskType: SpecificRiskType.CYCLONE, modelPart: RiskModelPart.HAZARD, criterion: 'rainfall', label: 'Précipitations CHIRPS', weight: 0.25 },
  { riskType: SpecificRiskType.CYCLONE, modelPart: RiskModelPart.RISK, criterion: 'hazard', label: 'Aléa cyclonique', weight: 0.70 },
  { riskType: SpecificRiskType.CYCLONE, modelPart: RiskModelPart.RISK, criterion: 'population', label: 'Population exposée', weight: 0.20 },
  { riskType: SpecificRiskType.CYCLONE, modelPart: RiskModelPart.RISK, criterion: 'landcover_vulnerability', label: 'Vulnérabilité occupation du sol', weight: 0.10 },
];

@Injectable()
export class RisquesService implements OnModuleInit {
  constructor(
    @InjectRepository(CriteriaWeight)
    private readonly criteriaWeightsRepository: Repository<CriteriaWeight>,

    @InjectRepository(RiskModelWeight)
    private readonly riskModelWeightsRepository: Repository<RiskModelWeight>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultWeights();
    await this.seedDefaultRiskModelWeights();
  }

  async seedDefaultWeights() {
    for (const item of DEFAULT_WEIGHTS) {
      const existing = await this.criteriaWeightsRepository.findOne({
        where: {
          criterionCode: item.criterionCode,
        },
      });

      if (!existing) {
        await this.criteriaWeightsRepository.save(
          this.criteriaWeightsRepository.create(item),
        );
      }
    }
  }

  findWeights() {
    return this.criteriaWeightsRepository.find({
      where: {
        isActive: true,
      },
      order: {
        criterionCode: 'ASC',
      },
    });
  }

  async updateWeights(dto: UpdateCriteriaWeightsDto) {
    const normalizedInput = dto.weights.map((item) => ({
      criterionCode: item.criterionCode,
      weight: Number(item.weight),
    }));

    for (const item of normalizedInput) {
      if (!Number.isFinite(item.weight)) {
        throw new BadRequestException(
          `Poids invalide pour ${item.criterionCode}`,
        );
      }

      if (item.weight < 0 || item.weight > 1) {
        throw new BadRequestException(
          `Le poids de ${item.criterionCode} doit être compris entre 0 et 1.`,
        );
      }
    }

    const sum = normalizedInput.reduce(
      (total, item) => total + item.weight,
      0,
    );

    const roundedSum = Number(sum.toFixed(4));

    if (Math.abs(roundedSum - 1) > 0.001) {
      throw new BadRequestException(
        `La somme des poids doit être égale à 1. Somme actuelle: ${roundedSum}`,
      );
    }

    for (const item of normalizedInput) {
      const existing = await this.criteriaWeightsRepository.findOne({
        where: {
          criterionCode: item.criterionCode,
        },
      });

      if (!existing) {
        throw new BadRequestException(
          `Critère inconnu: ${item.criterionCode}`,
        );
      }

      existing.weight = Number(item.weight.toFixed(4));
      await this.criteriaWeightsRepository.save(existing);
    }

    return this.findWeights();
  }

  async getWeightsAsObject() {
    const weights = await this.findWeights();

    return weights.reduce(
      (acc, item) => {
        acc[item.criterionCode] = item.weight;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async seedDefaultRiskModelWeights() {
    for (const item of DEFAULT_RISK_MODEL_WEIGHTS) {
      const existing = await this.riskModelWeightsRepository.findOne({
        where: {
          riskType: item.riskType,
          modelPart: item.modelPart,
          criterion: item.criterion,
        },
      });

      if (!existing) {
        await this.riskModelWeightsRepository.save(
          this.riskModelWeightsRepository.create(item),
        );
      }
    }
  }

  findRiskModelWeights(riskType?: SpecificRiskType) {
    return this.riskModelWeightsRepository.find({
      where: {
        isActive: true,
        ...(riskType ? { riskType } : {}),
      },
      order: {
        riskType: 'ASC',
        modelPart: 'ASC',
        criterion: 'ASC',
      },
    });
  }

  async getRiskModelWeightsObject(riskType: SpecificRiskType) {
    const rows = await this.findRiskModelWeights(riskType);

    const result: Record<string, Record<string, number>> = {
      HAZARD: {},
      RISK: {},
    };

    for (const row of rows) {
      result[row.modelPart][row.criterion] = row.weight;
    }

    return result;
  }

  private validateModelWeightSums(weights: { modelPart: RiskModelPart; weight: number }[]) {
    const grouped = weights.reduce<Record<string, number>>((acc, item) => {
      acc[item.modelPart] = (acc[item.modelPart] ?? 0) + Number(item.weight);
      return acc;
    }, {});

    for (const [modelPart, sum] of Object.entries(grouped)) {
      const rounded = Number(sum.toFixed(4));

      if (Math.abs(rounded - 1) > 0.001) {
        throw new BadRequestException(
          `La somme des poids ${modelPart} doit être égale à 1. Somme actuelle : ${rounded}`,
        );
      }
    }
  }

  async updateRiskModelWeights(dto: UpdateRiskModelWeightsDto) {
    const normalized = dto.weights.map((item) => ({
      modelPart: item.modelPart,
      criterion: item.criterion,
      weight: Number(item.weight),
    }));

    for (const item of normalized) {
      if (!Number.isFinite(item.weight) || item.weight < 0 || item.weight > 1) {
        throw new BadRequestException(
          `Poids invalide pour ${dto.riskType}/${item.modelPart}/${item.criterion}`,
        );
      }
    }

    this.validateModelWeightSums(normalized);

    for (const item of normalized) {
      const existing = await this.riskModelWeightsRepository.findOne({
        where: {
          riskType: dto.riskType,
          modelPart: item.modelPart,
          criterion: item.criterion,
        },
      });

      if (!existing) {
        throw new BadRequestException(
          `Critère inconnu : ${dto.riskType}/${item.modelPart}/${item.criterion}`,
        );
      }

      existing.weight = Number(item.weight.toFixed(4));

      await this.riskModelWeightsRepository.save(existing);
    }

    return this.findRiskModelWeights(dto.riskType);
  }

  async resetRiskModelWeights() {
    await this.riskModelWeightsRepository.clear();
    await this.seedDefaultRiskModelWeights();

    return this.findRiskModelWeights();
  }

  async recalculateRasterRisk() {
    const projectRoot = resolve(process.cwd(), '..');
    const etlDir = join(projectRoot, 'etl');

    const venvPython = join(etlDir, '.venv', 'bin', 'python');
    const pythonBin =
      process.env.PYTHON_BIN ??
      (existsSync(venvPython) ? venvPython : 'python3');

    const backendPort = process.env.BACKEND_PORT ?? 3001;
    const backendApiUrl =
      process.env.BACKEND_API_URL ?? `http://localhost:${backendPort}/api`;

    const env = {
      ...process.env,
      BACKEND_API_URL: backendApiUrl,
    };

    const scripts = [
      ['raster/weighted_overlay.py'],
      ['raster/mask_rasters_to_madagascar.py', '--scope', 'risk'],
      ['raster/register_raster_metadata.py'],
    ];

    const logs: string[] = [];

    try {
      for (const args of scripts) {
        const command = `${pythonBin} ${args.join(' ')}`;
        logs.push(`$ ${command}`);

        const { stdout, stderr } = await execFileAsync(pythonBin, args, {
          cwd: etlDir,
          env,
          timeout: 10 * 60 * 1000,
          maxBuffer: 1024 * 1024 * 20,
        });

        if (stdout) {
          logs.push(stdout);
        }

        if (stderr) {
          logs.push(stderr);
        }
      }

      return {
        message: 'Raster de risque recalculé avec succès.',
        backendApiUrl,
        logs,
      };
    } catch (error) {
      console.error('[RisquesService] Erreur recalcul raster:', error);

      throw new InternalServerErrorException(
        'Impossible de recalculer le raster de risque.',
      );
    }
  }

  async syncLatestChirpsAndRecalculate() {
    const projectRoot = resolve(process.cwd(), '..');
    const etlDir = join(projectRoot, 'etl');

    const venvPython = join(etlDir, '.venv', 'bin', 'python');
    const pythonBin =
      process.env.PYTHON_BIN ??
      (existsSync(venvPython) ? venvPython : 'python3');

    const backendPort = process.env.BACKEND_PORT ?? 3001;
    const backendApiUrl =
      process.env.BACKEND_API_URL ?? `http://localhost:${backendPort}/api`;

    const env = {
      ...process.env,
      BACKEND_API_URL: backendApiUrl,
    };

    const scripts = [
      ['raster/chirps/fetch_latest_chirps.py'],
      ['raster/mask_rasters_to_madagascar.py', '--scope', 'normalized'],
      ['raster/weighted_overlay.py'],
      ['raster/mask_rasters_to_madagascar.py', '--scope', 'risk'],
      ['raster/register_raster_metadata.py'],
    ];

    const logs: string[] = [];

    try {
      for (const args of scripts) {
        const command = `${pythonBin} ${args.join(' ')}`;
        logs.push(`$ ${command}`);

        const { stdout, stderr } = await execFileAsync(pythonBin, args, {
          cwd: etlDir,
          env,
          timeout: 15 * 60 * 1000,
          maxBuffer: 1024 * 1024 * 30,
        });

        if (stdout) logs.push(stdout);
        if (stderr) logs.push(stderr);
      }

      return {
        message: 'CHIRPS latest synchronisé et raster recalculé avec succès.',
        backendApiUrl,
        logs,
      };
    } catch (error) {
      console.error('[RisquesService] Erreur synchronisation CHIRPS:', error);

      throw new InternalServerErrorException(
        'Impossible de synchroniser CHIRPS et recalculer le raster.',
      );
    }
  }

}
