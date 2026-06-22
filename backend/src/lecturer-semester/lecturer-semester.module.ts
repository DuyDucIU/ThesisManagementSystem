import { Module } from '@nestjs/common';
import { LecturerSemesterService } from './lecturer-semester.service';

@Module({
  providers: [LecturerSemesterService],
  exports: [LecturerSemesterService],
})
export class LecturerSemesterModule {}
