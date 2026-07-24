import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  ZoneRiskLevel,
  ZoneType,
} from '../entities/zone-indicator.entity';

export class UpsertZoneIndicatorDto {
  @IsEnum(ZoneType)
  zoneType!: ZoneType;

  @IsUUID()
  zoneId!: string;

  @IsOptional()
  @IsString()
  zoneNom?: string;

  @IsOptional()
  @IsNumber()
  populationExposed?: number;

  @IsOptional()
  @IsNumber()
  areaKm2?: number;

  @IsOptional()
  @IsNumber()
  riskMean?: number;

  @IsOptional()
  @IsNumber()
  riskMax?: number;

  @IsOptional()
  @IsEnum(ZoneRiskLevel)
  riskLevel?: ZoneRiskLevel;
}
