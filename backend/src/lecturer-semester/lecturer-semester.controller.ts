import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LecturerSemesterService } from './lecturer-semester.service';
import { UpsertLecturerSemesterDto } from './dto/upsert-lecturer-semester.dto';
import { QueryLecturerSemesterDto } from './dto/query-lecturer-semester.dto';

type AuthUser = { role: Role; lecturer: { id: string } | null };

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
    @Param('lecturerId', ParseUUIDPipe) lecturerId: string,
    @Query() query: QueryLecturerSemesterDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    if (currentUser.role === Role.LECTURER) {
      if (!currentUser.lecturer || currentUser.lecturer.id !== lecturerId) {
        throw new ForbiddenException('You can only view your own capacity');
      }
    }
    const semesterId = query.semesterId ?? await this.lecturerSemesterService.resolveActiveSemesterId();
    const maxStudents = await this.lecturerSemesterService.resolveCapacity(lecturerId, semesterId);
    return { lecturerId, semesterId, maxStudents };
  }

  @Patch(':lecturerId')
  @Roles(Role.ADMIN)
  upsert(
    @Param('lecturerId', ParseUUIDPipe) lecturerId: string,
    @Body() dto: UpsertLecturerSemesterDto,
  ) {
    return this.lecturerSemesterService.upsert(lecturerId, dto);
  }
}
