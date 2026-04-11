# Authentication Design

**Date:** 2026-04-10
**Status:** Approved

## Overview

JWT-based authentication for a university thesis management system. No self-registration — users are imported by admins. Three roles: ADMIN, LECTURER, STUDENT.

## Decisions

- **No registration endpoint** — users are imported by admins
- **Token strategy**: Access token (30 min) + Refresh token (7 day), refresh stored hashed in DB (Option B — upgradeable to rotation later)
- **Refresh token storage**: Single `refreshToken` column on `User` (one session per user — new login replaces previous session)
- **Password hashing**: bcrypt
- **Profile in login response**: bundled (tokens + user profile in one response), `/me` available for re-fetching

---

## Schema Change

Add `refreshToken` (nullable) to the `User` model:

```prisma
model User {
  // ... existing fields
  refreshToken String? @map("refresh_token") @db.Text
}
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login with username + password |
| POST | `/auth/refresh` | Public | Get new access token via refresh token |
| POST | `/auth/logout` | Protected (any role) | Clears refresh token from DB |
| GET | `/auth/me` | Protected (any role) | Returns current user profile |

### POST `/auth/login`

**Request:**
```json
{ "username": "john.doe", "password": "secret" }
```

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": 1,
    "username": "john.doe",
    "role": "STUDENT",
    "fullName": "John Doe",
    "email": "john@university.edu"
  }
}
```

### POST `/auth/refresh`

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### POST `/auth/logout`

No request body. Returns `204 No Content`.

### GET `/auth/me`

**Response `200`:**
```json
{
  "id": 1,
  "username": "john.doe",
  "role": "STUDENT",
  "fullName": "John Doe",
  "email": "john@university.edu"
}
```

> Note: ADMIN users will have `fullName: null` and `email: null` — admins only have a `User` record, no profile table.

---

## Token Details

**Access token (JWT):**
- Payload: `{ sub: userId, role, username }`
- Expiry: `JWT_EXPIRY` env var (default `30m`)
- Secret: `JWT_SECRET` env var

**Refresh token:**
- A UUID string wrapped in a signed JWT (so expiry is verifiable without DB lookup)
- Expiry: 7 days
- Stored as bcrypt hash in `User.refreshToken`
- Raw token travels over the wire only — never stored plain

---

## Guards & Decorators

**Global JWT guard** applied at app level — all routes protected by default.

**`@Public()` decorator** — bypasses JWT guard. Applied to `/auth/login` and `/auth/refresh`.

**`@Roles(...roles)` decorator + `RolesGuard`** — restricts by role on top of auth:
- `@Roles(Role.ADMIN)` — admins only
- `@Roles(Role.LECTURER, Role.ADMIN)` — lecturers or admins
- No decorator — any authenticated user

**`request.user`** — on protected routes, full user (with Lecturer/Student profile joined) is fetched from DB and attached, not just the JWT payload.

---

## Error Handling

### Login (`POST /auth/login`)

| Scenario | HTTP | Body |
|----------|------|------|
| Missing/invalid fields | 400 | Validation error |
| Username not found | 401 | `{ message: "Invalid credentials" }` |
| Wrong password | 401 | `{ message: "Invalid credentials" }` |
| `isActive = false` | 401 | `{ message: "Account is disabled" }` |

> Username not found and wrong password return the same message intentionally — never reveal which is wrong.

### Refresh (`POST /auth/refresh`)

| Scenario | HTTP | Body |
|----------|------|------|
| Missing/invalid JWT | 401 | `{ message: "Invalid refresh token" }` |
| Token expired | 401 | `{ message: "Invalid refresh token" }` |
| User not found | 401 | `{ message: "Invalid refresh token" }` |
| Hash mismatch | 401 | `{ message: "Invalid refresh token" }` |

### Protected routes

| Scenario | HTTP | Body |
|----------|------|------|
| Missing/invalid access token | 401 | `{ message: "Unauthorized" }` |
| Insufficient role | 403 | `{ message: "Forbidden" }` |

---

## Security Notes

- Refresh token is hashed before storage — raw value only on the wire
- `isActive` checked on login only — disabled user's existing 30-min access token remains valid until expiry (acceptable tradeoff)
- No brute-force protection in scope (can be added later with rate limiting middleware)
- Env vars required: `JWT_SECRET`, `JWT_EXPIRY` (optional, default `30m`), `JWT_REFRESH_EXPIRY` (optional, default `7d`)

---

## Module Structure

```
backend/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   └── roles.decorator.ts
└── dto/
    ├── login.dto.ts
    └── refresh.dto.ts
```
