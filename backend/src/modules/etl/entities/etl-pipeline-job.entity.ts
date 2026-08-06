import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EtlPipelineJobType {
  RISK_PIPELINE = 'RISK_PIPELINE',
}

export enum EtlPipelineJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('etl_pipeline_jobs')
export class EtlPipelineJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EtlPipelineJobType,
    default: EtlPipelineJobType.RISK_PIPELINE,
  })
  type!: EtlPipelineJobType;

  @Column({
    type: 'enum',
    enum: EtlPipelineJobStatus,
    default: EtlPipelineJobStatus.PENDING,
  })
  status!: EtlPipelineJobStatus;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  steps?: unknown[] | null;

  @Column({ name: 'alert_warning', type: 'text', nullable: true })
  alertWarning?: string | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
