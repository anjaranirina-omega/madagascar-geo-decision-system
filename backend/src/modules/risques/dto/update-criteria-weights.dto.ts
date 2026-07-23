import {
  IsArray,
  IsEnum,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RiskCriterionCode } from '../entities/criteria-weight.entity';

export class CriterionWeightDto {
  @IsEnum(RiskCriterionCode)
  criterionCode!: RiskCriterionCode;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;
}

export class UpdateCriteriaWeightsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionWeightDto)
  weights!: CriterionWeightDto[];
}
