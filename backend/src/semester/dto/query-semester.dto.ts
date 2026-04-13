import { Transform } from 'class-transformer';
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
  @Transform(({ value }) => value || undefined)
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsDateString()
  startDateTo?: string;
}
