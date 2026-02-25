import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Department } from '../../common/enums';

export class SearchKnowledgeQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
