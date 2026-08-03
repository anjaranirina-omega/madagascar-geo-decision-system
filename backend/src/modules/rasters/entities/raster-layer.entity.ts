import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RasterLayerType {
  RAINFALL = 'RAINFALL',
  SLOPE = 'SLOPE',
  POPULATION = 'POPULATION',
  LANDCOVER = 'LANDCOVER',
  RISK_INDEX = 'RISK_INDEX',
  RISK_CLASSIFIED = 'RISK_CLASSIFIED',
  FLOOD_HAZARD_INDEX = 'FLOOD_HAZARD_INDEX',
  FLOOD_RISK_INDEX = 'FLOOD_RISK_INDEX',
  FLOOD_RISK_CLASSIFIED = 'FLOOD_RISK_CLASSIFIED',
  DROUGHT_HAZARD_INDEX = 'DROUGHT_HAZARD_INDEX',
  DROUGHT_RISK_INDEX = 'DROUGHT_RISK_INDEX',
  DROUGHT_RISK_CLASSIFIED = 'DROUGHT_RISK_CLASSIFIED',
  LANDSLIDE_HAZARD_INDEX = 'LANDSLIDE_HAZARD_INDEX',
  LANDSLIDE_RISK_INDEX = 'LANDSLIDE_RISK_INDEX',
  LANDSLIDE_RISK_CLASSIFIED = 'LANDSLIDE_RISK_CLASSIFIED',
  CYCLONE_HAZARD_INDEX = 'CYCLONE_HAZARD_INDEX',
  CYCLONE_RISK_INDEX = 'CYCLONE_RISK_INDEX',
  CYCLONE_RISK_CLASSIFIED = 'CYCLONE_RISK_CLASSIFIED',
  OTHER = 'OTHER',
}

@Entity('raster_layers')
export class RasterLayer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({
    type: 'enum',
    enum: RasterLayerType,
    default: RasterLayerType.OTHER,
  })
  type!: RasterLayerType;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true, length: 80 })
  crs?: string;

  @Column({ name: 'resolution_x', type: 'double precision', nullable: true })
  resolutionX?: number;

  @Column({ name: 'resolution_y', type: 'double precision', nullable: true })
  resolutionY?: number;

  @Column({ name: 'min_value', type: 'double precision', nullable: true })
  minValue?: number;

  @Column({ name: 'max_value', type: 'double precision', nullable: true })
  maxValue?: number;

  @Column({ name: 'mean_value', type: 'double precision', nullable: true })
  meanValue?: number;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ nullable: true, length: 80 })
  bounds?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
