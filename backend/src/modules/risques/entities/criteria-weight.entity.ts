import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RiskCriterionCode {
  RAINFALL = 'RAINFALL',
  SLOPE = 'SLOPE',
  POPULATION = 'POPULATION',
  LANDCOVER = 'LANDCOVER',
}

@Entity('risk_criteria_weights')
export class CriteriaWeight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'criterion_code',
    type: 'enum',
    enum: RiskCriterionCode,
    unique: true,
  })
  criterionCode!: RiskCriterionCode;

  @Column({ length: 100 })
  label!: string;

  @Column({ type: 'double precision' })
  weight!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
