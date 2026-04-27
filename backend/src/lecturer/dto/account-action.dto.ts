import { IsBoolean } from 'class-validator';

export class AccountActionDto {
  @IsBoolean()
  isActive: boolean;
}
