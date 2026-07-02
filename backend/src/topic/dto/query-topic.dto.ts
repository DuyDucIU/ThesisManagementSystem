import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { TopicStatus } from '@prisma/client';

export class QueryTopicDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsEnum(TopicStatus)
  status?: TopicStatus;

  @IsOptional()
  @IsUUID('4')
  lecturerId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
