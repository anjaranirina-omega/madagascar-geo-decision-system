import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import {
  DataSourceCode,
  DataSourceStatus,
} from '../entities/data-source-status.entity';

export class UpdateDataSourceStatusDto {
  @IsEnum(DataSourceCode)
  code!: DataSourceCode;

  @IsEnum(DataSourceStatus)
  status!: DataSourceStatus;

  @IsOptional()
  @IsString()
  lastErrorMessage?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
