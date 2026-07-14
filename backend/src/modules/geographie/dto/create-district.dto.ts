import { IsOptional, IsString } from 'class-validator';

export class CreateDistrictDto {
  @IsString()
  code!: string;

  @IsString()
  nom!: string;

  @IsString()
  regionId!: string;

  @IsOptional()
  geom?: object;
}
