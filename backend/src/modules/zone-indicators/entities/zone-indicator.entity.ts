import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ZoneType {
  REGION = 'region',
  DISTRICT = 'district',
  COMMUNE = 'commune',
}

export enum ZoneRiskLevel {
  FAIBLE = 'FAIBLE',
  MOYEN = 'MOYEN',
  ELEVE = 'ELEVE',
  CRITIQUE = 'CRITIQUE',
}

@Entity('zone_indicators')
@Unique(['zoneType', 'zoneId'])
export class ZoneIndicator {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'zone_type', type: 'enum', enum: ZoneType })
  zoneType!: ZoneType;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'zone_nom', nullable: true, length: 180 })
  zoneNom?: string;

  @Column({
    name: 'population_exposed',
    type: 'double precision',
    nullable: true,
  })
  populationExposed?: number;

  @Column({
    name: 'area_km2',
    type: 'double precision',
    nullable: true,
  })
  areaKm2?: number;

  @Column({
    name: 'risk_mean',
    type: 'double precision',
    nullable: true,
  })
  riskMean?: number;

  @Column({
    name: 'risk_max',
    type: 'double precision',
    nullable: true,
  })
  riskMax?: number;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: ZoneRiskLevel,
    nullable: true,
  })
  riskLevel?: ZoneRiskLevel;

  @Column({ name: 'raster_layer_id', type: 'uuid', nullable: true })
  rasterLayerId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
