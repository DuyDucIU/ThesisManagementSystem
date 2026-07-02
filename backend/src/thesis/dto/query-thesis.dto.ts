import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ThesisStatus } from '@prisma/client';

export class QueryThesisDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsEnum(ThesisStatus)
  status?: ThesisStatus;

  @IsOptional()
  @IsUUID('4')
  lecturerId?: string;

  @IsOptional()
  @IsUUID('4')
  topicId?: string;
}
