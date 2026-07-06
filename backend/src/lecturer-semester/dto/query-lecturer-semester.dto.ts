import { IsOptional, IsUUID } from 'class-validator';

export class QueryLecturerSemesterDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;
}
