import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import {
  AcademicDepartment,
  Role,
  SupportArea,
} from '../../common/enums';

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
  @IsEnum(SupportArea)
  supportArea?: SupportArea | null;

  @IsOptional()
  @IsEnum(AcademicDepartment)
  academicDepartment?: AcademicDepartment | null;

  @IsOptional()
  @IsEmail()
  email?: string;
}
