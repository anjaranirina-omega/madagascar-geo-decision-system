import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SyncActiveCycloneItemDto {
  @IsString()
  gdacsEventId!: string;

  @IsOptional()
  @IsString()
  gdacsEpisodeId?: string | null;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsString()
  windSpeed?: string | null;

  @IsString()
  severityLevel!: string;

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @IsDateString()
  fromDate?: string | null;

  @IsOptional()
  @IsDateString()
  toDate?: string | null;

  @IsOptional()
  trackGeojson?: Record<string, any> | null;
}

export class SyncActiveCyclonesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncActiveCycloneItemDto)
  cyclones!: SyncActiveCycloneItemDto[];

  @IsOptional()
  @IsDateString()
  fetchedAt?: string;

  @IsOptional()
  @IsNumber()
  totalGlobal?: number;
}
