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

  async findRegionsGeoJson() {
    const rows = await this.regionsRepository
      .createQueryBuilder('region')
      .select([
        'region.id AS id',
        'region.code AS code',
        'region.nom AS nom',
        'ST_AsGeoJSON(region.geom)::json AS geometry',
      ])
      .orderBy('region.nom', 'ASC')
      .getRawMany();

    return {
      type: 'FeatureCollection',
      features: rows
        .filter((row) => row.geometry)
        .map((row) => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: {
            id: row.id,
            code: row.code,
            nom: row.nom,
            type: 'region',
          },
        })),
    };
  }

  async findDistrictsGeoJson() {
    const rows = await this.districtsRepository
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
      .orderBy('district.nom', 'ASC')
      .getRawMany();

    return {
      type: 'FeatureCollection',
      features: rows
        .filter((row) => row.geometry)
        .map((row) => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: {
            id: row.id,
            code: row.code,
            nom: row.nom,
            type: 'district',
            region: {
              id: row.region_id,
              code: row.region_code,
              nom: row.region_nom,
            },
          },
        })),
    };
  }

  async findCommunesGeoJson() {
    const rows = await this.communesRepository
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
      .orderBy('commune.nom', 'ASC')
      .getRawMany();

    return {
      type: 'FeatureCollection',
      features: rows
        .filter((row) => row.geometry)
        .map((row) => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: {
            id: row.id,
            code: row.code,
            nom: row.nom,
            type: 'commune',
            district: {
              id: row.district_id,
              code: row.district_code,
              nom: row.district_nom,
            },
            region: {
              id: row.region_id,
              code: row.region_code,
              nom: row.region_nom,
            },
          },
        })),
    };
  }


  async locatePoint(latitude: number, longitude: number) {
    const commune = await this.communesRepository
      .createQueryBuilder('commune')
      .leftJoin('commune.district', 'district')
      .leftJoin('district.region', 'region')
      .select([
        'commune.id AS commune_id',
        'commune.code AS commune_code',
        'commune.nom AS commune_nom',
        'district.id AS district_id',
        'district.code AS district_code',
        'district.nom AS district_nom',
        'region.id AS region_id',
        'region.code AS region_code',
        'region.nom AS region_nom',
      ])
      .where(
        `
        commune.geom IS NOT NULL
        AND ST_Intersects(
          commune.geom,
          ST_SetSRID(ST_Point(:longitude, :latitude), 4326)
        )
        `,
        { latitude, longitude },
      )
      .getRawOne();

    if (commune) {
      return {
        latitude,
        longitude,
        region: {
          id: commune.region_id,
          code: commune.region_code,
          nom: commune.region_nom,
        },
        district: {
          id: commune.district_id,
          code: commune.district_code,
          nom: commune.district_nom,
        },
        commune: {
          id: commune.commune_id,
          code: commune.commune_code,
          nom: commune.commune_nom,
        },
      };
    }

    const district = await this.districtsRepository
      .createQueryBuilder('district')
      .leftJoin('district.region', 'region')
      .select([
        'district.id AS district_id',
        'district.code AS district_code',
        'district.nom AS district_nom',
        'region.id AS region_id',
        'region.code AS region_code',
        'region.nom AS region_nom',
      ])
      .where(
        `
        district.geom IS NOT NULL
        AND ST_Intersects(
          district.geom,
          ST_SetSRID(ST_Point(:longitude, :latitude), 4326)
        )
        `,
        { latitude, longitude },
      )
      .getRawOne();

    if (district) {
      return {
        latitude,
        longitude,
        region: {
          id: district.region_id,
          code: district.region_code,
          nom: district.region_nom,
        },
        district: {
          id: district.district_id,
          code: district.district_code,
          nom: district.district_nom,
        },
        commune: null,
      };
    }

    const region = await this.regionsRepository
      .createQueryBuilder('region')
      .select([
        'region.id AS region_id',
        'region.code AS region_code',
        'region.nom AS region_nom',
      ])
      .where(
        `
        region.geom IS NOT NULL
        AND ST_Intersects(
          region.geom,
          ST_SetSRID(ST_Point(:longitude, :latitude), 4326)
        )
        `,
        { latitude, longitude },
      )
      .getRawOne();

    if (region) {
      return {
        latitude,
        longitude,
        region: {
          id: region.region_id,
          code: region.region_code,
          nom: region.region_nom,
        },
        district: null,
        commune: null,
      };
    }

    return {
      latitude,
      longitude,
      region: null,
      district: null,
      commune: null,
    };
  }


  async getZoneSummary(type: string, id: string) {
    const normalizedType = type.toLowerCase();

    let tableName: string;
    let label: string;

    if (normalizedType === 'region' || normalizedType === 'regions') {
      tableName = 'regions';
      label = 'region';
    } else if (normalizedType === 'district' || normalizedType === 'districts') {
      tableName = 'districts';
      label = 'district';
    } else if (normalizedType === 'commune' || normalizedType === 'communes') {
      tableName = 'communes';
      label = 'commune';
    } else {
      throw new NotFoundException('Type de zone inconnu');
    }

    const zone = await this.regionsRepository.query(
      `
      SELECT
        id,
        code,
        nom,
        ST_Area(geom::geography) / 1000000 AS area_km2
      FROM ${tableName}
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    if (!zone || zone.length === 0) {
      throw new NotFoundException('Zone introuvable');
    }

    const latestRaster = await this.regionsRepository.query(
      `
      SELECT created_at, updated_at
      FROM raster_layers
      WHERE type = 'RISK_INDEX'
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
      `,
    );

    const indicator = await this.regionsRepository.query(
      `
      SELECT
        population_exposed,
        area_km2,
        risk_mean,
        risk_max,
        risk_level,
        updated_at
      FROM zone_indicators
      WHERE zone_type = $1
      AND zone_id = $2
      LIMIT 1
      `,
      [label, id],
    );

    const areaKm2 =
      indicator?.[0]?.area_km2 !== undefined &&
      indicator?.[0]?.area_km2 !== null
        ? Number(indicator[0].area_km2)
        : Number(zone[0].area_km2 ?? 0);

    return {
      zone: {
        id: zone[0].id,
        code: zone[0].code,
        nom: zone[0].nom,
        type: label,
      },
      populationExposed:
        indicator?.[0]?.population_exposed !== undefined &&
        indicator?.[0]?.population_exposed !== null
          ? Number(indicator[0].population_exposed)
          : null,
      areaKm2: Number(areaKm2.toFixed(2)),
      riskMean:
        indicator?.[0]?.risk_mean !== undefined &&
        indicator?.[0]?.risk_mean !== null
          ? Number(indicator[0].risk_mean)
          : null,
      riskMax:
        indicator?.[0]?.risk_max !== undefined &&
        indicator?.[0]?.risk_max !== null
          ? Number(indicator[0].risk_max)
          : null,
      riskLevel: indicator?.[0]?.risk_level ?? null,
      activeAlerts: 0,
      lastUpdated:
        indicator?.[0]?.updated_at ??
        latestRaster?.[0]?.created_at ??
        latestRaster?.[0]?.updated_at ??
        null,
    };
  }

}
