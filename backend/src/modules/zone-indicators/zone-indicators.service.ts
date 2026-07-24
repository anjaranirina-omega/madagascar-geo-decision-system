import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertZoneIndicatorDto } from './dto/upsert-zone-indicator.dto';
import { ZoneIndicator, ZoneType } from './entities/zone-indicator.entity';

@Injectable()
export class ZoneIndicatorsService {
  constructor(
    @InjectRepository(ZoneIndicator)
    private readonly zoneIndicatorsRepository: Repository<ZoneIndicator>,
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
}
