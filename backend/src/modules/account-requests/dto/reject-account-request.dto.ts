import { IsOptional, IsString } from 'class-validator';

export class RejectAccountRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
