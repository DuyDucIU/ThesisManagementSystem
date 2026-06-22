import {
  Controller,
  Get,
  Post,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ThesisService } from './thesis.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { QueryThesisDto } from './dto/query-thesis.dto';

type AuthUser = { role: Role; lecturer: { id: number } | null };

@Controller('theses')
@Roles(Role.LECTURER, Role.ADMIN)
export class ThesisController {
  constructor(private readonly thesisService: ThesisService) {}

  @Get()
  findAll(@Query() query: QueryThesisDto, @CurrentUser() user: AuthUser) {
    return this.thesisService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.thesisService.findOne(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  assign(@Body() dto: CreateThesisDto, @CurrentUser() user: AuthUser) {
    return this.thesisService.assign(dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassign(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.thesisService.unassign(id, user);
  }
}
