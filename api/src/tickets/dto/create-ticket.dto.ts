import { IsEnum, IsString, MinLength } from 'class-validator';
import { SupportArea } from '../../common/enums';

export class CreateTicketDto {
  @IsEnum(SupportArea)
  supportArea!: SupportArea;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}
