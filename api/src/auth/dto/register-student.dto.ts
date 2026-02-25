import { IsString, Matches, MinLength } from 'class-validator';

export class RegisterStudentDto {
  @Matches(/^\d{8}$/, { message: 'schoolId must contain exactly 8 digits.' })
  schoolId!: string;

  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;
}
