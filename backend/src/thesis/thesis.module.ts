import { Module } from '@nestjs/common';
import { ThesisController } from './thesis.controller';
import { ThesisService } from './thesis.service';
import { LecturerSemesterModule } from '../lecturer-semester/lecturer-semester.module';

@Module({
  imports: [LecturerSemesterModule],
  controllers: [ThesisController],
  providers: [ThesisService],
})
export class ThesisModule {}
