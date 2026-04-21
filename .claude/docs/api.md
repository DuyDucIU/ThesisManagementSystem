# API — REST Conventions

## URL Structure

| Pattern | Action |
|---------|--------|
| `GET /resources` | List all |
| `GET /resources/:id` | Get one |
| `POST /resources` | Create |
| `PATCH /resources/:id` | Partial update |
| `DELETE /resources/:id` | Remove |

Use kebab-case for multi-word resources: `/semester-students`, `/thesis-reviews`.

## HTTP Status Codes

| Code | When |
|------|------|
| 200 | Successful GET or PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE or logout (no body) |
| 400 | Validation error (class-validator) |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but wrong role |
| 404 | Resource not found |
| 409 | Conflict (duplicate, constraint violation) |

Use `@HttpCode(204)` on endpoints that return no body.

## Request Validation

Global `ValidationPipe` is configured in `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

- `whitelist: true` — strips any properties not declared in the DTO
- Validation errors automatically return 400 with a `message` array

DTOs use `class-validator` decorators:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  semesterId: number;
}
```

## Response Shapes

Return plain objects or arrays from service methods — NestJS serializes them to JSON automatically. Do not wrap in `{ data: ... }` envelopes unless there is pagination metadata.

For lists with pagination (when needed):
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

For errors, NestJS's built-in exception filter produces:
```json
{
  "statusCode": 404,
  "message": "Thesis not found",
  "error": "Not Found"
}
```

Throw using built-in exceptions:
```typescript
import { NotFoundException, ConflictException } from '@nestjs/common';

throw new NotFoundException('Thesis not found');
throw new ConflictException('Student already enrolled in this semester');
```

## Controller Pattern

```typescript
@Controller('topics')
export class TopicController {
  constructor(private topicService: TopicService) {}

  @Get()
  findAll() {
    return this.topicService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.topicService.findOne(id);
  }

  @Post()
  @Roles(Role.LECTURER)
  create(@Body() dto: CreateTopicDto, @CurrentUser() user: User) {
    return this.topicService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.LECTURER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTopicDto) {
    return this.topicService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.topicService.remove(id);
  }
}
```

## Common Pipes

- `ParseIntPipe` — converts `:id` route param from string to number, throws 400 if not an integer
- `ValidationPipe` — global, applied in `main.ts`

## Guard Execution Order

Guards run in registration order from `AppModule`:

1. `JwtAuthGuard` — validates token, populates `request.user`
2. `RolesGuard` — checks `request.user.role` against `@Roles()`

This means `@CurrentUser()` is always populated by the time `RolesGuard` runs.
