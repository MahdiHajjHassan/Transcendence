import { IsEnum, IsString, MinLength } from 'class-validator';
import { Department } from '../../common/enums';

export class CreateTicketDto {
  @IsEnum(Department)
  department!: Department;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}
