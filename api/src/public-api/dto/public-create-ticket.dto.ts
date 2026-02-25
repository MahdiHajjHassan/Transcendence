import { IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { Department } from '../../common/enums';

export class PublicCreateTicketDto {
  @Matches(/^\d{8}$/, { message: 'studentSchoolId must be 8 digits.' })
  studentSchoolId!: string;

  @IsEnum(Department)
  department!: Department;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}
