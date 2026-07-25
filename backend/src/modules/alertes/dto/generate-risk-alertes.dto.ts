import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateRiskAlertesDto {
  @IsOptional()
  @IsString()
  zoneType?: 'region' | 'district' | 'commune';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thresholdEleve?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thresholdCritique?: number;
}
