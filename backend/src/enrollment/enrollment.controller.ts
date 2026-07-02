import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnrollmentService } from './enrollment.service';
import { QueryEnrollmentDto } from './dto/query-enrollment.dto';

type AuthUser = { role: Role };

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  @Roles(Role.ADMIN, Role.LECTURER)
  findAll(@Query() query: QueryEnrollmentDto, @CurrentUser() user: AuthUser) {
    return this.enrollmentService.findAll(query, user.role);
  }

  @Post('import')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importEnrollments(
    @UploadedFile() file: Express.Multer.File,
    @Query('action') action: 'parse' | 'import',
    @Query('semesterId', new ParseUUIDPipe({ optional: true }))
    semesterId?: string,
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
