import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationalRiskType {
  FLOOD = 'FLOOD',
  DROUGHT = 'DROUGHT',
  LANDSLIDE = 'LANDSLIDE',
  CYCLONE = 'CYCLONE',
}

export enum OperationalSignalLevel {
  FAIBLE = 'FAIBLE',
  MOYEN = 'MOYEN',
  ELEVE = 'ELEVE',
  CRITIQUE = 'CRITIQUE',
}

@Entity('operational_risk_signals')
@Unique(['riskType', 'zoneType', 'zoneId'])
@Index(['riskType', 'zoneType'])
@Index(['signalLevel'])
export class OperationalRiskSignal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'risk_type', type: 'enum', enum: OperationalRiskType })
  riskType!: OperationalRiskType;

  @Column({ name: 'zone_type', type: 'varchar', length: 50 })
  zoneType!: string;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'zone_nom', type: 'varchar', length: 180 })
  zoneNom!: string;

  @Column({ name: 'background_risk_max', type: 'double precision', nullable: true })
  backgroundRiskMax?: number | null;

  @Column({ name: 'background_risk_mean', type: 'double precision', nullable: true })
  backgroundRiskMean?: number | null;

  @Column({ name: 'weather_factor', type: 'double precision', nullable: true })
  weatherFactor?: number | null;

  @Column({ name: 'signal_score', type: 'double precision' })
  signalScore!: number;

  @Column({ name: 'signal_level', type: 'enum', enum: OperationalSignalLevel })
  signalLevel!: OperationalSignalLevel;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'observed_at', type: 'timestamptz', nullable: true })
  observedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
