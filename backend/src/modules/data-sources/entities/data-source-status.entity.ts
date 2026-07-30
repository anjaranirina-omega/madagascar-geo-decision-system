import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum DataSourceCode {
  CHIRPS = 'CHIRPS',
  COPERNICUS_DEM = 'COPERNICUS_DEM',
  WORLDPOP = 'WORLDPOP',
  ESA_WORLDCOVER = 'ESA_WORLDCOVER',
  HYDRORIVERS = 'HYDRORIVERS',
  OPENWEATHER = 'OPENWEATHER',
  NASA_POWER = 'NASA_POWER',
}

export enum DataSourceCategory {
  CLIMATE = 'CLIMATE',
  TOPOGRAPHY = 'TOPOGRAPHY',
  POPULATION = 'POPULATION',
  LANDCOVER = 'LANDCOVER',
  HYDROLOGY = 'HYDROLOGY',
  WEATHER = 'WEATHER',
}

export enum DataSourceStatus {
  CONNECTED = 'CONNECTED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED',
}

@Entity('data_sources')
@Unique(['code'])
export class DataSourceStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: DataSourceCode,
  })
  code!: DataSourceCode;

  @Column({ length: 160 })
  name!: string;

  @Column({
    type: 'enum',
    enum: DataSourceCategory,
  })
  category!: DataSourceCategory;

  @Column({ type: 'varchar', nullable: true, length: 160 })
  provider?: string | null;

  @Column({ nullable: true, type: 'text' })
  description?: string | null;

  @Column({ nullable: true, type: 'text' })
  url?: string | null;

  @Column({
    type: 'enum',
    enum: DataSourceStatus,
    default: DataSourceStatus.PENDING,
  })
  status!: DataSourceStatus;

  @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
  lastSyncAt?: Date | null;

  @Column({ name: 'last_success_at', type: 'timestamp', nullable: true })
  lastSuccessAt?: Date | null;

  @Column({ name: 'last_error_at', type: 'timestamp', nullable: true })
  lastErrorAt?: Date | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
