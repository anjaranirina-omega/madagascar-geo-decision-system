import {
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RiskModelPart,
  SpecificRiskType,
} from '../entities/risk-model-weight.entity';

export class RiskModelWeightItemDto {
  @IsEnum(RiskModelPart)
  modelPart!: RiskModelPart;

  @IsString()
  criterion!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;
}

export class UpdateRiskModelWeightsDto {
  @IsEnum(SpecificRiskType)
  riskType!: SpecificRiskType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskModelWeightItemDto)
  weights!: RiskModelWeightItemDto[];
}
