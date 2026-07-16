import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RasterLayerType } from '../entities/raster-layer.entity';

export class CreateRasterLayerDto {
  @IsString()
  name!: string;

  @IsEnum(RasterLayerType)
  type!: RasterLayerType;

  @IsString()
  filePath!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  crs?: string;

  @IsOptional()
  @IsNumber()
  resolutionX?: number;

  @IsOptional()
  @IsNumber()
  resolutionY?: number;

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsOptional()
  @IsNumber()
  meanValue?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsString()
  bounds?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
