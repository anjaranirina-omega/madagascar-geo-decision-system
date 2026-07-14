import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  InterventionStatus,
  InterventionType,
} from '../entities/intervention.entity';

export class CreateInterventionDto {
  @IsEnum(InterventionType)
  type!: InterventionType;

  @IsOptional()
  @IsEnum(InterventionStatus)
  statut?: InterventionStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dateIntervention!: string;

  @IsOptional()
  @IsUUID()
  communeId?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
