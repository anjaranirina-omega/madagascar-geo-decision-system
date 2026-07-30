import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ZoneRiskLevel, ZoneType } from '../entities/zone-indicator.entity';
import { RiskType } from '../entities/zone-risk-indicator.entity';

export class UpsertZoneRiskIndicatorDto {
  @IsEnum(RiskType)
  riskType!: RiskType;

  @IsEnum(ZoneType)
  zoneType!: ZoneType;

  @IsUUID()
  zoneId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  zoneCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  zoneNom?: string;

  @IsOptional()
  @IsNumber()
  riskMean?: number | null;

  @IsOptional()
  @IsNumber()
  riskMax?: number | null;

  @IsOptional()
  @IsNumber()
  hazardMean?: number | null;

  @IsOptional()
  @IsNumber()
  populationExposed?: number | null;

  @IsOptional()
  @IsNumber()
  areaKm2?: number | null;

  @IsOptional()
  @IsEnum(ZoneRiskLevel)
  riskLevel?: ZoneRiskLevel | null;
}
