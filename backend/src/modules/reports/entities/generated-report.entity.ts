import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('generated_reports')
export class GeneratedReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ name: 'report_type', type: 'varchar', length: 80 })
  reportType!: string;

  @Column({ type: 'varchar', length: 20 })
  format!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 240 })
  fileName!: string;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 160 })
  mimeType!: string;

  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, unknown> | null;

  @Column({ name: 'generated_by', type: 'varchar', length: 180, nullable: true })
  generatedBy?: string | null;

  @Column({ name: 'generated_at_local', type: 'varchar', length: 80, nullable: true })
  generatedAtLocal?: string | null;

  @Column({ type: 'varchar', length: 40, default: '1.0' })
  version!: string;

  @Column({ type: 'varchar', length: 40, default: 'GENERATED' })
  status!: string;

  @Column({ name: 'file_size_bytes', type: 'int', nullable: true })
  fileSizeBytes?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
