import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateCommuneDto } from './dto/create-commune.dto';
import { CreateDistrictDto } from './dto/create-district.dto';
import { CreateRegionDto } from './dto/create-region.dto';
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

  async createRegion(dto: CreateRegionDto) {
    const exists = await this.regionsRepository.findOne({
      where: { code: dto.code },
    });

    if (exists) {
      throw new ConflictException('Cette région existe déjà');
    }

    const region = this.regionsRepository.create({
      code: dto.code,
      nom: dto.nom,
      geom: dto.geom,
    });

    return this.regionsRepository.save(region);
  }

  async createDistrict(dto: CreateDistrictDto) {
    const exists = await this.districtsRepository.findOne({
      where: { code: dto.code },
    });

    if (exists) {
      throw new ConflictException('Ce district existe déjà');
    }

    const region = await this.regionsRepository.findOne({
      where: { id: dto.regionId },
    });

    if (!region) {
      throw new NotFoundException('Région introuvable');
    }

    const district = this.districtsRepository.create({
      code: dto.code,
      nom: dto.nom,
      region,
      geom: dto.geom,
    });

    return this.districtsRepository.save(district);
  }

  async createCommune(dto: CreateCommuneDto) {
    const exists = await this.communesRepository.findOne({
      where: { code: dto.code },
    });

    if (exists) {
      throw new ConflictException('Cette commune existe déjà');
    }

    const district = await this.districtsRepository.findOne({
      where: { id: dto.districtId },
    });

    if (!district) {
      throw new NotFoundException('District introuvable');
    }

    const commune = this.communesRepository.create({
      code: dto.code,
      nom: dto.nom,
      district,
      geom: dto.geom,
    });

    return this.communesRepository.save(commune);
  }

  findAllRegions() {
    return this.regionsRepository.find({
      order: { nom: 'ASC' },
    });
  }

  findAllDistricts(regionId?: string) {
    if (regionId) {
      return this.districtsRepository.find({
        where: {
          region: {
            id: regionId,
          },
        },
        order: { nom: 'ASC' },
      });
    }

    return this.districtsRepository.find({
      order: { nom: 'ASC' },
    });
  }

  findAllCommunes(districtId?: string) {
    if (districtId) {
      return this.communesRepository.find({
        where: {
          district: {
            id: districtId,
          },
        },
        order: { nom: 'ASC' },
      });
    }

    return this.communesRepository.find({
      order: { nom: 'ASC' },
    });
  }

  async findRegionById(id: string) {
    const region = await this.regionsRepository.findOne({
      where: { id },
    });

    if (!region) {
      throw new NotFoundException('Région introuvable');
    }

    return region;
  }

  async findDistrictById(id: string) {
    const district = await this.districtsRepository.findOne({
      where: { id },
    });

    if (!district) {
      throw new NotFoundException('District introuvable');
    }

    return district;
  }

  async findCommuneById(id: string) {
    const commune = await this.communesRepository.findOne({
      where: { id },
    });

    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    return commune;
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
        where: [{ nom: ILike(query) }, { code: ILike(query) }],
        take: 10,
        order: { nom: 'ASC' },
      }),
      this.districtsRepository.find({
        where: [{ nom: ILike(query) }, { code: ILike(query) }],
        take: 10,
        order: { nom: 'ASC' },
      }),
      this.communesRepository.find({
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
