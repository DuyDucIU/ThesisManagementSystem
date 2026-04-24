import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateLecturerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  lecturerId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
