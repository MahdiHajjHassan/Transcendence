import { Matches, MinLength } from 'class-validator';

export class LoginDto {
  @Matches(/^\d{8}$/, { message: 'schoolId must contain exactly 8 digits.' })
  schoolId!: string;

  @MinLength(8)
  password!: string;
}
