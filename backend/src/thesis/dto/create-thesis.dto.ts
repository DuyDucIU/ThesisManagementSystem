import { IsUUID } from 'class-validator';

export class CreateThesisDto {
  @IsUUID('4')
  enrollmentId: string;

  @IsUUID('4')
  topicId: string;
}
