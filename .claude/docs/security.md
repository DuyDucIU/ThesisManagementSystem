# Security — JWT Auth

## Overview

Authentication uses JWT access tokens + refresh tokens. There is no self-registration — users are imported by admins. Three roles: `ADMIN`, `LECTURER`, `STUDENT`.

## Token Design

| Token | Lifetime | Payload | Storage |
|-------|----------|---------|---------|
| Access token | 30 min | `{ sub, username, role }` | Client memory |
| Refresh token | 7 days | `{ sub, jti }` | Client (e.g. httpOnly cookie or local storage) |

- `jti` is a `randomUUID()` — the actual revocation key
- Only the bcrypt hash of `jti` is stored in `User.refreshToken`
- On refresh: verify JWT signature → extract `jti` → `bcrypt.compare(jti, storedHash)`
- On logout: set `User.refreshToken = null`

## Global Guard

`JwtAuthGuard` is registered as `APP_GUARD` in `AppModule` — **all routes are protected by default**:

```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
]
```

`JwtStrategy` validates the Bearer token, fetches the full user from DB (with `lecturer` and `student` includes), and attaches it to `request.user`. Throws `UnauthorizedException` if user not found or `isActive = false`.

## Decorators

### `@Public()` — opt a route out of JWT auth

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Post('login')
login(@Body() dto: LoginDto) { ... }
```

### `@Roles(...roles)` — restrict to specific roles

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.ADMIN)
@Get('users')
findAll() { ... }
```

Routes without `@Roles()` are accessible to any authenticated user (any role).

### `@CurrentUser()` — inject the authenticated user

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get('me')
getMe(@CurrentUser() user: User) {
  return user;
}
```

`user` is the full Prisma `User` object with `lecturer` and `student` relations included.

## Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Returns access + refresh tokens |
| POST | `/auth/refresh` | Public | Rotates token pair (old refresh revoked) |
| POST | `/auth/logout` | Any role | Revokes refresh token (204) |
| GET | `/auth/me` | Any role | Returns current user profile |

### Request / Response shapes

**POST /auth/login**
```json
// Request
{ "username": "admin", "password": "admin123" }

// Response 201
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": { "id": 1, "username": "admin", "role": "ADMIN", "fullName": null, "email": null }
}
```

**POST /auth/refresh**
```json
// Request
{ "refreshToken": "<jwt>" }

// Response 201
{ "accessToken": "<jwt>", "refreshToken": "<jwt>" }
```

**POST /auth/logout** — `Authorization: Bearer <accessToken>`
```
Response 204 (no body)
```

**GET /auth/me** — `Authorization: Bearer <accessToken>`
```json
// Response 200
{ "id": 1, "username": "admin", "role": "ADMIN", "fullName": null, "email": null }
```

## Password Storage

Passwords are bcrypt-hashed with cost factor 10. Users are seeded/imported with pre-hashed passwords — no plaintext passwords are ever stored.

## Adding Auth to a New Module

1. Import nothing — `JwtAuthGuard` and `RolesGuard` are global.
2. Add `@Roles(Role.ADMIN)` (or other roles) to restrict access.
3. Add `@Public()` only on endpoints that should be unauthenticated.
4. Inject `@CurrentUser()` wherever the authenticated user is needed.
