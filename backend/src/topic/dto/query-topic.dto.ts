import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { TopicStatus } from '@prisma/client';

export class QueryTopicDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId?: number;

  @IsOptional()
  @IsIn(['OPEN', 'FULL', 'CLOSED'])
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
