import { Module } from '@nestjs/common';
import { LecturerService } from './lecturer.service';
import { LecturerController } from './lecturer.controller';

@Module({
  controllers: [LecturerController],
  providers: [LecturerService],
})
export class LecturerModule {}
