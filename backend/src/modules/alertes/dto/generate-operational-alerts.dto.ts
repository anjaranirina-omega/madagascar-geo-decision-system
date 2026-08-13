import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateOperationalAlertsDto {
  @IsOptional()
  @IsString()
  @IsIn(['region', 'district', 'commune'])
  zoneType?: 'region' | 'district' | 'commune';
}
