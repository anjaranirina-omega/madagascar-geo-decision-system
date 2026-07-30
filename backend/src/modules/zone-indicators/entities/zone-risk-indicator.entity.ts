import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ZoneRiskLevel, ZoneType } from './zone-indicator.entity';

export enum RiskType {
  GLOBAL = 'GLOBAL',
  FLOOD = 'FLOOD',
  DROUGHT = 'DROUGHT',
  CYCLONE = 'CYCLONE',
  LANDSLIDE = 'LANDSLIDE',
  HEAT = 'HEAT',
  WIND = 'WIND',
}

@Entity('zone_risk_indicators')
@Unique(['riskType', 'zoneType', 'zoneId'])
@Index(['riskType', 'zoneType'])
@Index(['riskType', 'riskMax'])
export class ZoneRiskIndicator {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'risk_type', type: 'enum', enum: RiskType })
  riskType!: RiskType;

  @Column({ name: 'zone_type', type: 'enum', enum: ZoneType })
  zoneType!: ZoneType;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'zone_code', nullable: true, length: 80 })
  zoneCode?: string;

  @Column({ name: 'zone_nom', nullable: true, length: 180 })
  zoneNom?: string;

  @Column({
    name: 'risk_mean',
    type: 'double precision',
    nullable: true,
  })
  riskMean?: number | null;

  @Column({
    name: 'risk_max',
    type: 'double precision',
    nullable: true,
  })
  riskMax?: number | null;

  @Column({
    name: 'hazard_mean',
    type: 'double precision',
    nullable: true,
  })
  hazardMean?: number | null;

  @Column({
    name: 'population_exposed',
    type: 'double precision',
    nullable: true,
  })
  populationExposed?: number | null;

  @Column({
    name: 'area_km2',
    type: 'double precision',
    nullable: true,
  })
  areaKm2?: number | null;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: ZoneRiskLevel,
    nullable: true,
  })
  riskLevel?: ZoneRiskLevel | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
