import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID, IsBoolean } from 'class-validator';

export class AccountBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsBoolean()
  isActive: boolean;
}
