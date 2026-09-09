import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateRasterLayerDto } from './dto/create-raster-layer.dto';
import {
  RasterLayer,
  RasterLayerType,
} from './entities/raster-layer.entity';

@Injectable()
export class RastersService {
  constructor(
    @InjectRepository(RasterLayer)
    private readonly rasterLayersRepository: Repository<RasterLayer>,

    private readonly dataSource: DataSource,
  ) {}

  async register(dto: CreateRasterLayerDto) {
    const existing = await this.rasterLayersRepository.findOne({
      where: {
        filePath: dto.filePath,
      },
    });

    if (existing) {
      Object.assign(existing, {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        crs: dto.crs,
        resolutionX: dto.resolutionX,
        resolutionY: dto.resolutionY,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        meanValue: dto.meanValue,
        width: dto.width,
        height: dto.height,
        bounds: dto.bounds,
        isActive: dto.isActive ?? true,
      });

      return this.rasterLayersRepository.save(existing);
    }

    // When registering a NEW layer (no existing row for this filePath),
    // deactivate all previous versions of the same type so that only one
    // version per type can be isActive=true at any given time.
    // Both the deactivation UPDATE and the INSERT are wrapped in a single
    // transaction: if the INSERT fails, the deactivation is rolled back.
    const isActive = dto.isActive ?? true;

    return this.dataSource.transaction(async (manager) => {
      if (isActive) {
        await manager
          .createQueryBuilder()
          .update(RasterLayer)
          .set({ isActive: false })
          .where('type = :type AND is_active = true', { type: dto.type })
          .execute();
      }

      const layer = manager.create(RasterLayer, {
        ...dto,
        isActive,
      });

      return manager.save(layer);
    });
  }

  findAll(type?: RasterLayerType, activeOnly = false) {
    const whereClause: Record<string, unknown> = {};

    if (type) {
      whereClause.type = type;
    }

    if (activeOnly) {
      whereClause.isActive = true;
    }

    return this.rasterLayersRepository.find({
      where: whereClause,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const layer = await this.rasterLayersRepository.findOne({
      where: {
        id,
      },
    });

    if (!layer) {
      throw new NotFoundException('Couche raster introuvable');
    }

    return layer;
  }

  async findLatestRisk() {
    const layer = await this.rasterLayersRepository.findOne({
      where: {
        type: RasterLayerType.RISK_INDEX,
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!layer) {
      throw new NotFoundException(
        'Aucune couche raster de risque disponible',
      );
    }

    return layer;
  }

  async findLatestByType(type: RasterLayerType) {
    const layer = await this.rasterLayersRepository.findOne({
      where: {
        type,
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!layer) {
      throw new NotFoundException(
        `Aucune couche raster disponible pour le type ${type}`,
      );
    }

    return layer;
  }

}
