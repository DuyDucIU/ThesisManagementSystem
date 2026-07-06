import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AccountActionDto } from './dto/account-action.dto';
import { ActivateBulkDto } from './dto/activate-bulk.dto';
import { AccountBulkDto } from './dto/account-bulk.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
@Roles(Role.ADMIN)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.studentService.findAll(query);
  }

  @Post('activate-bulk')
  activateBulk(@Body() dto: ActivateBulkDto) {
    return this.studentService.activateBulk(dto);
  }

  @Patch('account-bulk')
  toggleAccountBulk(@Body() dto: AccountBulkDto) {
    return this.studentService.toggleAccountBulk(dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.CREATED)
  activateAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentService.activateAccount(id);
  }

  @Patch(':id/account')
  toggleAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AccountActionDto,
  ) {
    return this.studentService.toggleAccount(id, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentService.remove(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }
}
