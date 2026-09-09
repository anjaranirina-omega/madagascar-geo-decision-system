import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('active_cyclones')
@Index(['gdacsEventId', 'gdacsEpisodeId'], { unique: true })
@Index(['isActive'])
export class ActiveCyclone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'gdacs_event_id', type: 'varchar', length: 100 })
  gdacsEventId!: string;

  @Column({
    name: 'gdacs_episode_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  gdacsEpisodeId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number | null;

  @Column({ name: 'wind_speed', type: 'varchar', length: 100, nullable: true })
  windSpeed?: string | null;

  @Column({ name: 'severity_level', type: 'varchar', length: 100 })
  severityLevel!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  country?: string | null;

  @Column({ name: 'from_date', type: 'timestamptz', nullable: true })
  fromDate?: Date | null;

  @Column({ name: 'to_date', type: 'timestamptz', nullable: true })
  toDate?: Date | null;

  @Column({ name: 'track_geojson', type: 'jsonb', nullable: true })
  trackGeojson?: Record<string, any> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
