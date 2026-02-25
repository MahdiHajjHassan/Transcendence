import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Department } from '../../common/enums';

export class CreateFaqDto {
  @IsEnum(Department)
  department!: Department;

  @IsString()
  @MinLength(4)
  question!: string;

  @IsString()
  @MinLength(4)
  answer!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
