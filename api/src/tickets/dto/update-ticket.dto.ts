import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SupportArea } from '../../common/enums';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(SupportArea)
  supportArea?: SupportArea;

  @IsOptional()
  @IsString()
  @MinLength(3)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;
}
