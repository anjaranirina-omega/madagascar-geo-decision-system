import { IsOptional, IsString } from 'class-validator';

export class CreateCommuneDto {
  @IsString()
  code!: string;

  @IsString()
  nom!: string;

  @IsString()
  districtId!: string;

  @IsOptional()
  geom?: object;
}
