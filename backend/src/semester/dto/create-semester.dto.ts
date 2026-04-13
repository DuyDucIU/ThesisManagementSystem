import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
