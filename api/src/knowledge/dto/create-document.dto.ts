import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SupportArea } from '../../common/enums';

export class CreateKnowledgeDocumentDto {
  @IsEnum(SupportArea)
  supportArea!: SupportArea;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  content?: string;
}
