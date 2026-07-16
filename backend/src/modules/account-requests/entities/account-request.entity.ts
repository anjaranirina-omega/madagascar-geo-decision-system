import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum RequestedRole {
  DECIDEUR = 'DECIDEUR',
  ANALYSTE = 'ANALYSTE',
  AGENT_TERRAIN = 'AGENT_TERRAIN',
}

@Entity('account_requests')
export class AccountRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name', length: 150 })
  fullName!: string;

  @Column({ length: 180 })
  organization!: string;

  @Column({ length: 150 })
  position!: string;

  @Column({
    name: 'requested_role',
    type: 'enum',
    enum: RequestedRole,
  })
  requestedRole!: RequestedRole;

  @Column({ length: 180 })
  email!: string;

  @Column({ nullable: true, length: 50 })
  phone?: string;

  @Column({ type: 'text' })
  justification!: string;

  @Column({
    type: 'enum',
    enum: AccountRequestStatus,
    default: AccountRequestStatus.PENDING,
  })
  status!: AccountRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
