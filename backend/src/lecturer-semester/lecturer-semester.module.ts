import { Module } from '@nestjs/common';
import { LecturerSemesterController } from './lecturer-semester.controller';
import { LecturerSemesterService } from './lecturer-semester.service';

@Module({
  controllers: [LecturerSemesterController],
  providers: [LecturerSemesterService],
  exports: [LecturerSemesterService],
})
export class LecturerSemesterModule {}
