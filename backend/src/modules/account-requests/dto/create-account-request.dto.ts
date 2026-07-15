import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RequestedRole } from '../entities/account-request.entity';

export class CreateAccountRequestDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  organization!: string;

  @IsString()
  @MinLength(2)
  position!: string;

  @IsEnum(RequestedRole)
  requestedRole!: RequestedRole;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(10)
  justification!: string;
}
