import { IsEnum, IsOptional } from 'class-validator';
import {
  AcademicDepartment,
  SupportArea,
} from '../../common/enums';

export class UpdateUserRoutingDto {
  @IsOptional()
  @IsEnum(SupportArea)
  supportArea?: SupportArea | null;

  @IsOptional()
  @IsEnum(AcademicDepartment)
  academicDepartment?: AcademicDepartment | null;
}
