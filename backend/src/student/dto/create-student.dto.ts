import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  studentId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName: string;

  @IsEmail()
  @MaxLength(100)
  email: string;
}
