import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Department } from '../../common/enums';

export class PublicUpdateTicketDto {
  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsString()
  @MinLength(3)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;
}
