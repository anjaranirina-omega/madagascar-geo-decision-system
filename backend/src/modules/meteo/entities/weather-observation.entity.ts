import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('weather_observations')
@Index(['source', 'observedAt'])
@Index(['zoneType', 'zoneId', 'observedAt'])
export class WeatherObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, default: 'OPENWEATHER' })
  source!: string;

  @Column({ name: 'zone_type', type: 'varchar', length: 50, nullable: true })
  zoneType?: string | null;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId?: string | null;

  @Column({ name: 'zone_nom', type: 'varchar', length: 180, nullable: true })
  zoneNom?: string | null;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ type: 'double precision', nullable: true })
  temperature?: number | null;

  @Column({ type: 'double precision', nullable: true })
  humidity?: number | null;

  @Column({ name: 'wind_speed', type: 'double precision', nullable: true })
  windSpeed?: number | null;

  @Column({ name: 'wind_gust', type: 'double precision', nullable: true })
  windGust?: number | null;

  @Column({ type: 'double precision', nullable: true })
  pressure?: number | null;

  /**
   * Champ historique conservé pour compatibilité.
   * Il contient prioritairement rain_1h, sinon rain_3h, sinon 0.
   */
  @Column({ type: 'double precision', nullable: true })
  rainfall?: number | null;

  @Column({ name: 'rain_1h', type: 'double precision', nullable: true })
  rain1h?: number | null;

  @Column({ name: 'rain_3h', type: 'double precision', nullable: true })
  rain3h?: number | null;

  @Column({ type: 'double precision', nullable: true })
  clouds?: number | null;

  @Column({ name: 'weather_main', type: 'varchar', length: 100, nullable: true })
  weatherMain?: string | null;

  @Column({
    name: 'weather_description',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  weatherDescription?: string | null;

  @Column({ name: 'observed_at', type: 'timestamptz' })
  observedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  raw?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
