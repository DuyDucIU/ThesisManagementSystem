import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnrollmentService } from './enrollment.service';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

@Controller('enrollments')
@Roles(Role.ADMIN)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  findAll(@Query() query: QueryEnrollmentDto) {
    return this.enrollmentService.findAll(query);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importEnrollments(
    @UploadedFile() file: Express.Multer.File,
    @Query('action') action: 'parse' | 'import',
    @Query('semesterId', new ParseIntPipe({ optional: true }))
    semesterId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file before parsing.');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new BadRequestException('Only .xlsx and .xls files are accepted');
    }

    if (action === 'parse') {
      return this.enrollmentService.parseImport(file.buffer, semesterId);
    }
    if (action === 'import') {
      return this.enrollmentService.importEnrollments(file.buffer, semesterId);
    }
    throw new BadRequestException('action must be "parse" or "import"');
  }
}
