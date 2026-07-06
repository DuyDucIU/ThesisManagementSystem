import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';

type AuthUser = { lecturer: { id: string } | null };

@Controller('topics')
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  findAll(@Query() query: QueryTopicDto) {
    return this.topicService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.topicService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.LECTURER)
  create(@Body() dto: CreateTopicDto, @CurrentUser() user: AuthUser) {
    return this.topicService.create(dto, user.lecturer!.id);
  }

  @Patch(':id')
  @Roles(Role.LECTURER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTopicDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.topicService.update(id, dto, user.lecturer!.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.LECTURER)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.topicService.remove(id, user.lecturer!.id);
  }
}
