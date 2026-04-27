import { Type } from 'class-transformer';
import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsInt } from 'class-validator';

export class ActivateBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];
}
