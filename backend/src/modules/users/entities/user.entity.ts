import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ unique: true, length: 150 })
  email!: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ nullable: true, length: 30 })
  phone?: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl?: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: true })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @Column({ name: 'refresh_token_hash', nullable: true, select: false })
  refreshTokenHash?: string;

  @Column({ name: 'password_reset_token_hash', nullable: true, select: false })
  passwordResetTokenHash?: string;

  @Column({ name: 'password_reset_expires_at', type: 'timestamptz', nullable: true })
  passwordResetExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
