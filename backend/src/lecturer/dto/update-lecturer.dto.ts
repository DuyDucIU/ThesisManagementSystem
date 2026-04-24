import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateLecturerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  lecturerId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
