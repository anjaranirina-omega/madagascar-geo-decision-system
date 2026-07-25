import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CreateAlerteDto } from './dto/create-alerte.dto';
import { GenerateRiskAlertesDto } from './dto/generate-risk-alertes.dto';
import {
  Alerte,
  AlerteNiveau,
  AlerteStatus,
  AlerteType,
} from './entities/alerte.entity';

@Injectable()
export class AlertesService {
  constructor(
    @InjectRepository(Alerte)
    private readonly alertesRepository: Repository<Alerte>,
  ) {}

  create(dto: CreateAlerteDto) {
    const alerte = this.alertesRepository.create({
      ...dto,
      status: AlerteStatus.ACTIVE,
    });

    return this.alertesRepository.save(alerte);
  }

  findAll() {
    return this.alertesRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  findActive() {
    return this.alertesRepository.find({
      where: {
        status: AlerteStatus.ACTIVE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const alerte = await this.alertesRepository.findOne({
      where: { id },
    });

    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }

    return alerte;
  }

  async resolve(id: string) {
    const alerte = await this.findOne(id);

    alerte.status = AlerteStatus.RESOLUE;
    alerte.resolvedAt = new Date();

    return this.alertesRepository.save(alerte);
  }

  async ignore(id: string) {
    const alerte = await this.findOne(id);

    alerte.status = AlerteStatus.IGNOREE;

    return this.alertesRepository.save(alerte);
  }

  private getNiveauFromRisk(
    riskMax: number,
    thresholdEleve: number,
    thresholdCritique: number,
  ) {
    if (riskMax >= thresholdCritique) {
      return AlerteNiveau.CRITIQUE;
    }

    if (riskMax >= thresholdEleve) {
      return AlerteNiveau.ELEVE;
    }

    return null;
  }

  async generateFromRisk(dto: GenerateRiskAlertesDto) {
    const zoneType = dto.zoneType ?? 'region';
    const thresholdEleve = dto.thresholdEleve ?? 61;
    const thresholdCritique = dto.thresholdCritique ?? 81;

    const indicators = await this.alertesRepository.query(
      `
      SELECT
        zone_type,
        zone_id,
        zone_nom,
        population_exposed,
        risk_mean,
        risk_max,
        risk_level,
        updated_at
      FROM zone_indicators
      WHERE zone_type = $1
      AND risk_max IS NOT NULL
      AND risk_max >= $2
      ORDER BY risk_max DESC
      `,
      [zoneType, thresholdEleve],
    );

    const created: Alerte[] = [];
    const updated: Alerte[] = [];

    for (const indicator of indicators) {
      const riskMax = Number(indicator.risk_max);
      const riskMean =
        indicator.risk_mean !== null ? Number(indicator.risk_mean) : undefined;

      const niveau = this.getNiveauFromRisk(
        riskMax,
        thresholdEleve,
        thresholdCritique,
      );

      if (!niveau) {
        continue;
      }

      const existing = await this.alertesRepository.findOne({
        where: {
          zoneType,
          zoneId: indicator.zone_id,
          type: AlerteType.RISQUE_GLOBAL,
          status: AlerteStatus.ACTIVE,
        },
      });

      const titre =
        niveau === AlerteNiveau.CRITIQUE
          ? `Risque critique détecté - ${indicator.zone_nom}`
          : `Risque élevé détecté - ${indicator.zone_nom}`;

      const message =
        niveau === AlerteNiveau.CRITIQUE
          ? `La zone ${indicator.zone_nom} présente un niveau de risque critique avec un risque maximum de ${riskMax.toFixed(1)}/100. Une surveillance renforcée ou une intervention préventive est recommandée.`
          : `La zone ${indicator.zone_nom} présente un niveau de risque élevé avec un risque maximum de ${riskMax.toFixed(1)}/100. Une surveillance est recommandée.`;

      if (existing) {
        existing.niveau = niveau;
        existing.titre = titre;
        existing.message = message;
        existing.riskValue = riskMax;
        existing.riskMean = riskMean;
        existing.populationExposed =
          indicator.population_exposed !== null
            ? Number(indicator.population_exposed)
            : undefined;

        updated.push(await this.alertesRepository.save(existing));
        continue;
      }

      const alerte = this.alertesRepository.create({
        type: AlerteType.RISQUE_GLOBAL,
        niveau,
        titre,
        message,
        zoneType,
        zoneId: indicator.zone_id,
        zoneNom: indicator.zone_nom,
        riskValue: riskMax,
        riskMean,
        populationExposed:
          indicator.population_exposed !== null
            ? Number(indicator.population_exposed)
            : undefined,
        status: AlerteStatus.ACTIVE,
      });

      created.push(await this.alertesRepository.save(alerte));
    }

    return {
      message: `${created.length} alerte(s) créée(s), ${updated.length} mise(s) à jour.`,
      createdCount: created.length,
      updatedCount: updated.length,
      created,
      updated,
    };
  }
}
