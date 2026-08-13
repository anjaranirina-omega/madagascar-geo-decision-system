import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum SpecificRiskType {
  FLOOD = 'FLOOD',
  DROUGHT = 'DROUGHT',
  LANDSLIDE = 'LANDSLIDE',
  CYCLONE = 'CYCLONE',
}

export enum RiskModelPart {
  HAZARD = 'HAZARD',
  RISK = 'RISK',
}

@Entity('risk_model_weights')
@Unique(['riskType', 'modelPart', 'criterion'])
@Index(['riskType', 'modelPart'])
export class RiskModelWeight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'risk_type', type: 'enum', enum: SpecificRiskType })
  riskType!: SpecificRiskType;

  @Column({ name: 'model_part', type: 'enum', enum: RiskModelPart })
  modelPart!: RiskModelPart;

  @Column({ type: 'varchar', length: 120 })
  criterion!: string;

  @Column({ type: 'varchar', length: 180 })
  label!: string;

  @Column({ type: 'double precision' })
  weight!: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
