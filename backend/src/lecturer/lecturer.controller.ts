import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { LecturerService } from './lecturer.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { UpdateLecturerDto } from './dto/update-lecturer.dto';
import { QueryLecturerDto } from './dto/query-lecturer.dto';
import { AccountActionDto } from './dto/account-action.dto';
import { AccountBulkDto } from './dto/account-bulk.dto';

@Controller('lecturers')
@Roles(Role.ADMIN)
export class LecturerController {
  constructor(private readonly lecturerService: LecturerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLecturerDto) {
    return this.lecturerService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryLecturerDto) {
    return this.lecturerService.findAll(query);
  }

  @Patch('account-bulk')
  toggleAccountBulk(@Body() dto: AccountBulkDto) {
    return this.lecturerService.toggleAccountBulk(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lecturerService.findOne(id);
  }

  @Patch(':id/account')
  toggleAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccountActionDto,
  ) {
    return this.lecturerService.toggleAccount(id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLecturerDto,
  ) {
    return this.lecturerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lecturerService.remove(id);
  }
}
