import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Commune } from '../../geographie/entities/commune.entity';
import { User } from '../../users/entities/user.entity';

export enum InterventionStatus {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum InterventionType {
  EVALUATION = 'EVALUATION',
  SECOURS = 'SECOURS',
  EVACUATION = 'EVACUATION',
  DISTRIBUTION = 'DISTRIBUTION',
  REHABILITATION = 'REHABILITATION',
  AUTRE = 'AUTRE',
}

@Entity('interventions')
export class Intervention {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: InterventionType,
    default: InterventionType.AUTRE,
  })
  type!: InterventionType;

  @Column({
    type: 'enum',
    enum: InterventionStatus,
    default: InterventionStatus.PLANIFIEE,
  })
  statut!: InterventionStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'date_intervention', type: 'timestamptz' })
  dateIntervention!: Date;

  @ManyToOne(() => Commune, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'commune_id' })
  commune?: Commune;

  @ManyToOne(() => User, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'agent_id' })
  agent?: User;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom?: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
