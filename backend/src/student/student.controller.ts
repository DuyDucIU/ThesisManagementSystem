import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentService } from './student.service';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
@Roles(Role.ADMIN)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.studentService.findAll(query);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentService.remove(id);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importStudents(
    @UploadedFile() file: Express.Multer.File,
    @Query('action') action: 'parse' | 'import',
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file before parsing.');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new BadRequestException('Only .xlsx and .xls files are accepted');
    }

    if (action === 'parse') {
      return this.studentService.parseImport(file.buffer);
    }
    if (action === 'import') {
      return this.studentService.importStudents(file.buffer);
    }
    throw new BadRequestException('action must be "parse" or "import"');
  }
}
