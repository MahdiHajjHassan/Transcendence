import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { SupportArea } from '../../common/enums';

export class PublicCreateTicketDto {
  @Matches(/^\d{8}$/, { message: 'studentSchoolId must be 8 digits.' })
  studentSchoolId!: string;

  @IsOptional()
  @IsEnum(SupportArea)
  supportArea?: SupportArea;

  @IsOptional()
  @IsEnum(SupportArea)
  department?: SupportArea;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}
