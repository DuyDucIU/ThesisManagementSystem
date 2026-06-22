import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { LecturerSemesterService } from './lecturer-semester.service';
import { UpsertLecturerSemesterDto } from './dto/upsert-lecturer-semester.dto';
import { QueryLecturerSemesterDto } from './dto/query-lecturer-semester.dto';

@Controller('lecturer-semesters')
export class LecturerSemesterController {
  constructor(private readonly lecturerSemesterService: LecturerSemesterService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryLecturerSemesterDto) {
    return this.lecturerSemesterService.findAll(query.semesterId);
  }

  @Get('capacity/:lecturerId')
  @Roles(Role.ADMIN, Role.LECTURER)
  async getCapacity(
    @Param('lecturerId', ParseIntPipe) lecturerId: number,
    @Query() query: QueryLecturerSemesterDto,
  ) {
    const semesterId = query.semesterId ?? await this.lecturerSemesterService.resolveActiveSemesterId();
    const maxStudents = await this.lecturerSemesterService.resolveCapacity(lecturerId, semesterId);
    return { lecturerId, semesterId, maxStudents };
  }

  @Patch(':lecturerId')
  @Roles(Role.ADMIN)
  upsert(
    @Param('lecturerId', ParseIntPipe) lecturerId: number,
    @Body() dto: UpsertLecturerSemesterDto,
  ) {
    return this.lecturerSemesterService.upsert(lecturerId, dto);
  }
}
