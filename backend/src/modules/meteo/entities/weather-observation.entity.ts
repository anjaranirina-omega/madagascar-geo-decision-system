import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('weather_observations')
export class WeatherObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'OPENWEATHER' })
  source!: string;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ type: 'double precision', nullable: true })
  temperature?: number;

  @Column({ type: 'double precision', nullable: true })
  humidity?: number;

  @Column({ name: 'wind_speed', type: 'double precision', nullable: true })
  windSpeed?: number;

  @Column({ type: 'double precision', nullable: true })
  pressure?: number;

  @Column({ type: 'double precision', nullable: true })
  rainfall?: number;

  @Column({ name: 'weather_main', nullable: true })
  weatherMain?: string;

  @Column({ name: 'weather_description', nullable: true })
  weatherDescription?: string;

  @Column({ name: 'observed_at', type: 'timestamptz' })
  observedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
