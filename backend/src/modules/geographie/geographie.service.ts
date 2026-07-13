import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Commune } from './entities/commune.entity';
import { District } from './entities/district.entity';
import { Region } from './entities/region.entity';

@Injectable()
export class GeographieService {
  constructor(
    @InjectRepository(Region)
    private readonly regionsRepository: Repository<Region>,

    @InjectRepository(District)
    private readonly districtsRepository: Repository<District>,

    @InjectRepository(Commune)
    private readonly communesRepository: Repository<Commune>,
  ) {}

  findAllRegions() {
    return this.regionsRepository
      .createQueryBuilder('region')
      .select([
        'region.id',
        'region.code',
        'region.nom',
        'region.createdAt',
        'region.updatedAt',
      ])
      .orderBy('region.nom', 'ASC')
      .getMany();
  }

  findAllDistricts(regionId?: string) {
    const qb = this.districtsRepository
      .createQueryBuilder('district')
      .leftJoinAndSelect('district.region', 'region')
      .select([
        'district.id',
        'district.code',
        'district.nom',
        'district.createdAt',
        'district.updatedAt',
        'region.id',
        'region.code',
        'region.nom',
      ])
      .orderBy('district.nom', 'ASC');

    if (regionId) {
      qb.where('region.id = :regionId', { regionId });
    }

    return qb.getMany();
  }

  findAllCommunes(districtId?: string) {
    const qb = this.communesRepository
      .createQueryBuilder('commune')
      .leftJoinAndSelect('commune.district', 'district')
      .leftJoinAndSelect('district.region', 'region')
      .select([
        'commune.id',
        'commune.code',
        'commune.nom',
        'commune.createdAt',
        'commune.updatedAt',
        'district.id',
        'district.code',
        'district.nom',
        'region.id',
        'region.code',
        'region.nom',
      ])
      .orderBy('commune.nom', 'ASC');

    if (districtId) {
      qb.where('district.id = :districtId', { districtId });
    }

    return qb.getMany();
  }

  async findRegionById(id: string) {
    const result = await this.regionsRepository
      .createQueryBuilder('region')
      .select([
        'region.id AS id',
        'region.code AS code',
        'region.nom AS nom',
        'ST_AsGeoJSON(region.geom)::json AS geometry',
      ])
      .where('region.id = :id', { id })
      .getRawOne();

    if (!result) {
      throw new NotFoundException('Région introuvable');
    }

    return {
      type: 'Feature',
      geometry: result.geometry,
      properties: {
        id: result.id,
        code: result.code,
        nom: result.nom,
        type: 'region',
      },
    };
  }

  async findDistrictById(id: string) {
    const result = await this.districtsRepository
      .createQueryBuilder('district')
      .leftJoin('district.region', 'region')
      .select([
        'district.id AS id',
        'district.code AS code',
        'district.nom AS nom',
        'region.id AS region_id',
        'region.code AS region_code',
        'region.nom AS region_nom',
        'ST_AsGeoJSON(district.geom)::json AS geometry',
      ])
      .where('district.id = :id', { id })
      .getRawOne();

    if (!result) {
      throw new NotFoundException('District introuvable');
    }

    return {
      type: 'Feature',
      geometry: result.geometry,
      properties: {
        id: result.id,
        code: result.code,
        nom: result.nom,
        type: 'district',
        region: {
          id: result.region_id,
          code: result.region_code,
          nom: result.region_nom,
        },
      },
    };
  }

  async findCommuneById(id: string) {
    const result = await this.communesRepository
      .createQueryBuilder('commune')
      .leftJoin('commune.district', 'district')
      .leftJoin('district.region', 'region')
      .select([
        'commune.id AS id',
        'commune.code AS code',
        'commune.nom AS nom',
        'district.id AS district_id',
        'district.code AS district_code',
        'district.nom AS district_nom',
        'region.id AS region_id',
        'region.code AS region_code',
        'region.nom AS region_nom',
        'ST_AsGeoJSON(commune.geom)::json AS geometry',
      ])
      .where('commune.id = :id', { id })
      .getRawOne();

    if (!result) {
      throw new NotFoundException('Commune introuvable');
    }

    return {
      type: 'Feature',
      geometry: result.geometry,
      properties: {
        id: result.id,
        code: result.code,
        nom: result.nom,
        type: 'commune',
        district: {
          id: result.district_id,
          code: result.district_code,
          nom: result.district_nom,
        },
        region: {
          id: result.region_id,
          code: result.region_code,
          nom: result.region_nom,
        },
      },
    };
  }

  async search(q: string) {
    if (!q || q.trim().length < 2) {
      return {
        regions: [],
        districts: [],
        communes: [],
      };
    }

    const query = `%${q.trim()}%`;

    const [regions, districts, communes] = await Promise.all([
      this.regionsRepository.find({
        select: {
          id: true,
          code: true,
          nom: true,
        },
        where: [{ nom: ILike(query) }, { code: ILike(query) }],
        take: 10,
        order: { nom: 'ASC' },
      }),
      this.districtsRepository.find({
        select: {
          id: true,
          code: true,
          nom: true,
        },
        where: [{ nom: ILike(query) }, { code: ILike(query) }],
        take: 10,
        order: { nom: 'ASC' },
      }),
      this.communesRepository.find({
        select: {
          id: true,
          code: true,
          nom: true,
        },
        where: [{ nom: ILike(query) }, { code: ILike(query) }],
        take: 10,
        order: { nom: 'ASC' },
      }),
    ]);

    return {
      regions,
      districts,
      communes,
    };
  }
}
