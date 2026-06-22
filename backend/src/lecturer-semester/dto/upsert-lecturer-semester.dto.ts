import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertLecturerSemesterDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxStudents: number;
}
