import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';

export class ActivateBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];
}
