import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ZoneType } from '../../zone-indicators/entities/zone-indicator.entity';

export enum ClimateDataSource {
  NASA_POWER = 'NASA_POWER',
  OPENWEATHER = 'OPENWEATHER',
}

@Entity('climate_observations')
@Unique(['source', 'zoneType', 'zoneId', 'observedDate'])
@Index(['source', 'observedDate'])
@Index(['zoneType', 'zoneId'])
export class ClimateObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ClimateDataSource,
  })
  source!: ClimateDataSource;

  @Column({ name: 'zone_type', type: 'enum', enum: ZoneType })
  zoneType!: ZoneType;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'zone_code', type: 'varchar', length: 80, nullable: true })
  zoneCode?: string | null;

  @Column({ name: 'zone_nom', type: 'varchar', length: 180, nullable: true })
  zoneNom?: string | null;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ name: 'observed_date', type: 'date' })
  observedDate!: string;

  @Column({
    name: 'temperature_mean',
    type: 'double precision',
    nullable: true,
  })
  temperatureMean?: number | null;

  @Column({
    name: 'humidity_mean',
    type: 'double precision',
    nullable: true,
  })
  humidityMean?: number | null;

  @Column({
    name: 'wind_speed_mean',
    type: 'double precision',
    nullable: true,
  })
  windSpeedMean?: number | null;

  @Column({
    name: 'precipitation',
    type: 'double precision',
    nullable: true,
  })
  precipitation?: number | null;

  @Column({ type: 'jsonb', nullable: true })
  raw?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
