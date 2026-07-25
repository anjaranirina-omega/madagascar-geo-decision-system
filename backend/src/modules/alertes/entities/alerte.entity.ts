import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlerteType {
  RISQUE_GLOBAL = 'RISQUE_GLOBAL',
  INONDATION = 'INONDATION',
  CYCLONE = 'CYCLONE',
  SECHERESSE = 'SECHERESSE',
  GLISSEMENT_TERRAIN = 'GLISSEMENT_TERRAIN',
  VENT_VIOLENT = 'VENT_VIOLENT',
}

export enum AlerteNiveau {
  FAIBLE = 'FAIBLE',
  MOYEN = 'MOYEN',
  ELEVE = 'ELEVE',
  CRITIQUE = 'CRITIQUE',
}

export enum AlerteStatus {
  ACTIVE = 'ACTIVE',
  RESOLUE = 'RESOLUE',
  IGNOREE = 'IGNOREE',
}

@Entity('alertes')
@Index(['zoneType', 'zoneId', 'type', 'status'])
export class Alerte {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AlerteType,
    default: AlerteType.RISQUE_GLOBAL,
  })
  type!: AlerteType;

  @Column({
    type: 'enum',
    enum: AlerteNiveau,
  })
  niveau!: AlerteNiveau;

  @Column({ length: 180 })
  titre!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'zone_type', length: 50, nullable: true })
  zoneType?: string;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId?: string;

  @Column({ name: 'zone_nom', length: 180, nullable: true })
  zoneNom?: string;

  @Column({ name: 'risk_value', type: 'double precision', nullable: true })
  riskValue?: number;

  @Column({ name: 'risk_mean', type: 'double precision', nullable: true })
  riskMean?: number;

  @Column({ name: 'population_exposed', type: 'double precision', nullable: true })
  populationExposed?: number;

  @Column({
    type: 'enum',
    enum: AlerteStatus,
    default: AlerteStatus.ACTIVE,
  })
  status!: AlerteStatus;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
