import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Department } from '../../common/enums';

export class CreateKnowledgeDocumentDto {
  @IsEnum(Department)
  department!: Department;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  content?: string;
}
