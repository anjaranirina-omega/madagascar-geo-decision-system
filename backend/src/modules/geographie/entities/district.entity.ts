import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Commune } from './commune.entity';
import { Region } from './region.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ length: 150 })
  nom!: string;

  @ManyToOne(() => Region, (region) => region.districts, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'region_id' })
  region?: Region;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'MultiPolygon',
    srid: 4326,
    nullable: true,
  })
  geom?: object;

  @OneToMany(() => Commune, (commune) => commune.district)
  communes!: Commune[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
