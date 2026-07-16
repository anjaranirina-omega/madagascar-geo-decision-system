import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    const layer = this.rasterLayersRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });

    return this.rasterLayersRepository.save(layer);
  }

  findAll(type?: RasterLayerType) {
    if (type) {
      return this.rasterLayersRepository.find({
        where: {
          type,
          isActive: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }

    return this.rasterLayersRepository.find({
      where: {
        isActive: true,
      },
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
}
