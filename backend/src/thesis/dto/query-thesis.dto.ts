import { IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ThesisStatus } from '@prisma/client';

export class QueryThesisDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @IsEnum(ThesisStatus)
  status?: ThesisStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lecturerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;
}
