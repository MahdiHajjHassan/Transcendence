import { IsOptional, IsString, MinLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
