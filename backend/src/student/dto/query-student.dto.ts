import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class QueryStudentDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value; // let @IsBoolean() reject it
  })
  @IsBoolean()
  hasAccount?: boolean;

  @IsOptional()
  @IsIn(['no-account', 'active', 'inactive'])
  accountStatus?: 'no-account' | 'active' | 'inactive';

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
