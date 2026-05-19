import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsEnum, Min } from 'class-validator';
import { TopicStatus } from '@prisma/client';

export class QueryTopicDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @IsEnum(TopicStatus)
  status?: TopicStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lecturerId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
