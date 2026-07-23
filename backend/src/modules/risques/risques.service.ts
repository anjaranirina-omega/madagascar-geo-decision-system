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
import {
  CriteriaWeight,
  RiskCriterionCode,
} from './entities/criteria-weight.entity';

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

@Injectable()
export class RisquesService implements OnModuleInit {
  constructor(
    @InjectRepository(CriteriaWeight)
    private readonly criteriaWeightsRepository: Repository<CriteriaWeight>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultWeights();
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
}
