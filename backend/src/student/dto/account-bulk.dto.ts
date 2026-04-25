import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsInt, IsBoolean } from 'class-validator';

export class AccountBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];

  @IsBoolean()
  isActive: boolean;
}
