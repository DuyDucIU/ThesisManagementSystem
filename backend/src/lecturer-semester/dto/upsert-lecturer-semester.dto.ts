import { IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertLecturerSemesterDto {
  @IsUUID('4')
  semesterId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxStudents: number;
}
