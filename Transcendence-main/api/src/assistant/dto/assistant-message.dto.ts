import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { SupportArea } from '../../common/enums';

export class AssistantMessageDto {
  @IsString()
  @MinLength(2)
  message!: string;

  @IsOptional()
  @IsEnum(SupportArea)
  supportArea?: SupportArea;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  createTicketOnDecline?: boolean;
}
