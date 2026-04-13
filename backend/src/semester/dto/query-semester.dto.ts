import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { SemesterStatus } from '@prisma/client';

export class QuerySemesterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SemesterStatus)
  status?: SemesterStatus;

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;
}
