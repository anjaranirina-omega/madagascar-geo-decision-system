import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commune } from '../geographie/entities/commune.entity';
import { User } from '../users/entities/user.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { Intervention } from './entities/intervention.entity';

@Injectable()
export class InterventionsService {
  constructor(
    @InjectRepository(Intervention)
    private readonly interventionsRepository: Repository<Intervention>,

    @InjectRepository(Commune)
    private readonly communesRepository: Repository<Commune>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateInterventionDto) {
    let commune: Commune | undefined;
    let agent: User | undefined;

    if (dto.communeId) {
      const foundCommune = await this.communesRepository.findOne({
        where: { id: dto.communeId },
      });

      if (!foundCommune) {
        throw new NotFoundException('Commune introuvable');
      }

      commune = foundCommune;
    }

    if (dto.agentId) {
      const foundAgent = await this.usersRepository.findOne({
        where: { id: dto.agentId },
      });

      if (!foundAgent) {
        throw new NotFoundException('Agent introuvable');
      }

      agent = foundAgent;
    }

    const intervention = this.interventionsRepository.create({
      type: dto.type,
      statut: dto.statut,
      description: dto.description,
      dateIntervention: new Date(dto.dateIntervention),
      commune,
      agent,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    const saved = await this.interventionsRepository.save(intervention);

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.interventionsRepository.query(
        `
        UPDATE interventions
        SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)
        WHERE id = $3
        `,
        [dto.longitude, dto.latitude, saved.id],
      );
    }

    return this.findOne(saved.id);
  }

  findAll() {
    return this.interventionsRepository.find({
      order: { dateIntervention: 'DESC' },
    });
  }

  async findOne(id: string) {
    const intervention = await this.interventionsRepository.findOne({
      where: { id },
    });

    if (!intervention) {
      throw new NotFoundException('Intervention introuvable');
    }

    return intervention;
  }

  findByCommune(communeId: string) {
    return this.interventionsRepository.find({
      where: {
        commune: {
          id: communeId,
        },
      },
      order: { dateIntervention: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateInterventionDto) {
    const intervention = await this.findOne(id);

    if (dto.communeId) {
      const commune = await this.communesRepository.findOne({
        where: { id: dto.communeId },
      });

      if (!commune) {
        throw new NotFoundException('Commune introuvable');
      }

      intervention.commune = commune;
    }

    if (dto.agentId) {
      const agent = await this.usersRepository.findOne({
        where: { id: dto.agentId },
      });

      if (!agent) {
        throw new NotFoundException('Agent introuvable');
      }

      intervention.agent = agent;
    }

    Object.assign(intervention, {
      type: dto.type ?? intervention.type,
      statut: dto.statut ?? intervention.statut,
      description: dto.description ?? intervention.description,
      dateIntervention: dto.dateIntervention
        ? new Date(dto.dateIntervention)
        : intervention.dateIntervention,
      latitude: dto.latitude ?? intervention.latitude,
      longitude: dto.longitude ?? intervention.longitude,
    });

    await this.interventionsRepository.save(intervention);

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.interventionsRepository.query(
        `
        UPDATE interventions
        SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)
        WHERE id = $3
        `,
        [dto.longitude, dto.latitude, id],
      );
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const intervention = await this.findOne(id);
    await this.interventionsRepository.remove(intervention);

    return { deleted: true };
  }
}
