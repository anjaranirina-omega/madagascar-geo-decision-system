import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  AlerteNiveau,
  AlerteType,
} from '../entities/alerte.entity';

export class CreateAlerteDto {
  @IsEnum(AlerteType)
  type!: AlerteType;

  @IsEnum(AlerteNiveau)
  niveau!: AlerteNiveau;

  @IsString()
  titre!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  zoneType?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsString()
  zoneNom?: string;

  @IsOptional()
  @IsNumber()
  riskValue?: number;

  @IsOptional()
  @IsNumber()
  riskMean?: number;

  @IsOptional()
  @IsNumber()
  populationExposed?: number;
}
