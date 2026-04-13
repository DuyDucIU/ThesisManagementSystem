import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SemesterService } from './semester.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { QuerySemesterDto } from './dto/query-semester.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('semesters')
@Roles(Role.ADMIN)
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Get()
  findAll(@Query() query: QuerySemesterDto) {
    return this.semesterService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.semesterService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.semesterService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.remove(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.activate(id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.deactivate(id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(@Param('id', ParseIntPipe) id: number) {
    return this.semesterService.close(id);
  }
}
