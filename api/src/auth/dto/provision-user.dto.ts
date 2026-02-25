import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Department, Role } from '../../common/enums';

export class ProvisionUserDto {
  @Matches(/^\d{8}$/, { message: 'schoolId must contain exactly 8 digits.' })
  schoolId!: string;

  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsEmail()
  email?: string;
}
