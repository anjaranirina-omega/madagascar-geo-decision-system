import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerateWeatherRiskAlertDto {
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  zoneType?: 'region' | 'district' | 'commune';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  riskThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rainfallThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  windThreshold?: number;
}
