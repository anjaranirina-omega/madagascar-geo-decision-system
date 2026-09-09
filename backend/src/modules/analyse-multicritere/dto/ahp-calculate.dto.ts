import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class AhpCalculateDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'Au moins 2 critères sont nécessaires pour le calcul AHP.' })
  @IsString({ each: true })
  criteria!: string[];

  @IsArray()
  @ArrayMinSize(2, { message: 'La matrice AHP doit comporter au moins 2 lignes.' })
  matrix!: number[][];

  @IsOptional()
  @IsObject()
  normalizedValues?: Record<string, number>;
}
