import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateThesisDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  enrollmentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId: number;
}
