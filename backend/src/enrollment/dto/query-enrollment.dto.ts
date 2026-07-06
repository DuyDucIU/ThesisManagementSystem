import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsUUID, Min, Max, IsEnum } from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class QueryEnrollmentDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
