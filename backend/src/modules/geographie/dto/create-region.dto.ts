import { IsOptional, IsString } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  code!: string;

  @IsString()
  nom!: string;

  @IsOptional()
  geom?: object;
}
