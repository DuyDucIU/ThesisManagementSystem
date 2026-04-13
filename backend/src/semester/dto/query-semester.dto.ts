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

  @Transform(({ value }) => value || undefined)
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @Transform(({ value }) => value || undefined)
  @IsOptional()
  @IsDateString()
  startDateTo?: string;
}
