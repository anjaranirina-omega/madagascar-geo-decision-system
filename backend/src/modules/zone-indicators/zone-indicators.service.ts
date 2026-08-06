import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertZoneIndicatorDto } from './dto/upsert-zone-indicator.dto';
import { UpsertZoneRiskIndicatorDto } from './dto/upsert-zone-risk-indicator.dto';
import {
  ZoneIndicator,
  ZoneRiskLevel,
  ZoneType,
} from './entities/zone-indicator.entity';
import {
  RiskType,
  ZoneRiskIndicator,
} from './entities/zone-risk-indicator.entity';

@Injectable()
export class ZoneIndicatorsService {
  constructor(
    @InjectRepository(ZoneIndicator)
    private readonly zoneIndicatorsRepository: Repository<ZoneIndicator>,

    @InjectRepository(ZoneRiskIndicator)
    private readonly zoneRiskIndicatorsRepository: Repository<ZoneRiskIndicator>,
  ) {}

  async upsert(dto: UpsertZoneIndicatorDto) {
    const existing = await this.zoneIndicatorsRepository.findOne({
      where: {
        zoneType: dto.zoneType,
        zoneId: dto.zoneId,
      },
    });

    if (existing) {
      Object.assign(existing, dto);
      return this.zoneIndicatorsRepository.save(existing);
    }

    return this.zoneIndicatorsRepository.save(
      this.zoneIndicatorsRepository.create(dto),
    );
  }

  private normalizeRiskIndicatorPayload(
    dto: UpsertZoneRiskIndicatorDto,
  ): UpsertZoneRiskIndicatorDto {
    const raw = dto as unknown as Record<string, unknown>;

    const riskType = raw.riskType ?? raw.risk_type;
    const zoneType = raw.zoneType ?? raw.zone_type;
    const zoneId = raw.zoneId ?? raw.zone_id;

    if (!riskType || !Object.values(RiskType).includes(riskType as RiskType)) {
      throw new BadRequestException({
        message: 'riskType invalide ou manquant.',
        expected: Object.values(RiskType),
        received: riskType ?? null,
      });
    }

    if (!zoneType || !Object.values(ZoneType).includes(zoneType as ZoneType)) {
      throw new BadRequestException({
        message: 'zoneType invalide ou manquant.',
        expected: Object.values(ZoneType),
        received: zoneType ?? null,
      });
    }

    if (!zoneId || typeof zoneId !== 'string') {
      throw new BadRequestException({
        message: 'zoneId manquant ou invalide.',
        received: zoneId ?? null,
      });
    }

    const riskLevel = raw.riskLevel ?? raw.risk_level ?? null;

    if (
      riskLevel !== null &&
      riskLevel !== undefined &&
      !Object.values(ZoneRiskLevel).includes(riskLevel as ZoneRiskLevel)
    ) {
      throw new BadRequestException({
        message: 'riskLevel invalide.',
        expected: Object.values(ZoneRiskLevel),
        received: riskLevel,
      });
    }

    return {
      riskType: riskType as RiskType,
      zoneType: zoneType as ZoneType,
      zoneId: zoneId as string,
      zoneCode: (raw.zoneCode ?? raw.zone_code ?? null) as string | undefined,
      zoneNom: (raw.zoneNom ?? raw.zone_nom ?? null) as string | undefined,
      riskMean: this.toNullableNumber(raw.riskMean ?? raw.risk_mean),
      riskMax: this.toNullableNumber(raw.riskMax ?? raw.risk_max),
      hazardMean: this.toNullableNumber(raw.hazardMean ?? raw.hazard_mean),
      populationExposed: this.toNullableNumber(
        raw.populationExposed ?? raw.population_exposed,
      ),
      areaKm2: this.toNullableNumber(raw.areaKm2 ?? raw.area_km2),
      riskLevel: riskLevel as ZoneRiskLevel | null,
    };
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  async upsertRiskIndicator(dto: UpsertZoneRiskIndicatorDto) {
    const normalizedDto = this.normalizeRiskIndicatorPayload(dto);

    const existing = await this.zoneRiskIndicatorsRepository.findOne({
      where: {
        riskType: normalizedDto.riskType,
        zoneType: normalizedDto.zoneType,
        zoneId: normalizedDto.zoneId,
      },
    });

    if (existing) {
      Object.assign(existing, normalizedDto);
      return this.zoneRiskIndicatorsRepository.save(existing);
    }

    return this.zoneRiskIndicatorsRepository.save(
      this.zoneRiskIndicatorsRepository.create(normalizedDto),
    );
  }

  findOne(zoneType: ZoneType, zoneId: string) {
    return this.zoneIndicatorsRepository.findOne({
      where: {
        zoneType,
        zoneId,
      },
    });
  }

  findAll(zoneType?: ZoneType) {
    if (zoneType) {
      return this.zoneIndicatorsRepository.find({
        where: {
          zoneType,
        },
        order: {
          riskMax: 'DESC',
        },
      });
    }

    return this.zoneIndicatorsRepository.find({
      order: {
        riskMax: 'DESC',
      },
    });
  }

  findByRisk(riskType: RiskType, zoneType?: ZoneType) {
    return this.zoneRiskIndicatorsRepository.find({
      where: {
        riskType,
        ...(zoneType ? { zoneType } : {}),
      },
      order: {
        riskMax: 'DESC',
      },
    });
  }

  findTopByRisk(riskType: RiskType, zoneType?: ZoneType, limit = 10) {
    return this.zoneRiskIndicatorsRepository.find({
      where: {
        riskType,
        ...(zoneType ? { zoneType } : {}),
      },
      order: {
        riskMax: 'DESC',
      },
      take: Math.min(Math.max(Number(limit) || 10, 1), 100),
    });
  }

  async getRiskSummary(riskType: RiskType, zoneType?: ZoneType) {
    const rows = await this.findByRisk(riskType, zoneType);

    const validRiskMean = rows
      .map((row) => row.riskMean)
      .filter((value): value is number => typeof value === 'number');

    const validRiskMax = rows
      .map((row) => row.riskMax)
      .filter((value): value is number => typeof value === 'number');

    const validPopulation = rows
      .map((row) => row.populationExposed)
      .filter((value): value is number => typeof value === 'number');

    const levels = rows.reduce<Record<string, number>>((acc, row) => {
      const level = row.riskLevel ?? 'NON_DEFINI';
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    }, {});

    return {
      riskType,
      zoneType: zoneType ?? 'ALL',
      totalZones: rows.length,
      riskMean:
        validRiskMean.length > 0
          ? validRiskMean.reduce((sum, value) => sum + value, 0) /
            validRiskMean.length
          : null,
      riskMax: validRiskMax.length > 0 ? Math.max(...validRiskMax) : null,
      populationExposed:
        validPopulation.length > 0
          ? validPopulation.reduce((sum, value) => sum + value, 0)
          : null,
      levels,
    };
  }
}
