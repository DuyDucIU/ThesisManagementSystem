import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';

export class QueryLecturerDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  accountStatus?: 'active' | 'inactive';

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
