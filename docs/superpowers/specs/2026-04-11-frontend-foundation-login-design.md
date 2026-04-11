# Frontend Foundation & Login Page — Design Spec

**Date:** 2026-04-11  
**Branch:** feature/authentication  
**Scope:** Frontend foundation (routing, auth state, HTTP client) + Login page UI. Does not include any feature pages beyond login.

---

## 1. Dependencies

### Frontend (`frontend/`)

| Package | Purpose |
|---------|---------|
| `tailwindcss` v4 + `@tailwindcss/vite` | Utility-first CSS via Vite plugin |
| `shadcn/ui` (CLI) | Copy-paste component library built on Radix UI + Tailwind |
| `react-router` v7 | Client-side routing |
| `zustand` | Lightweight global state — auth store |
| `axios` | HTTP client with interceptor support |

### Backend (`backend/`)

No new packages. Small changes to 3 existing auth endpoints to support httpOnly cookies (see Section 4).

---

## 2. Source Structure

Feature-based organization — each feature is a self-contained folder. Shared infrastructure lives at the top level.

```
frontend/src/
├── features/
│   └── auth/
│       ├── components/
│       │   └── LoginPage.tsx      # Login page (split layout)
│       ├── store/
│       │   └── authStore.ts       # Zustand store — user + accessToken in memory
│       └── api.ts                 # Auth API calls (login, refresh, logout, me)
├── components/
│   └── ui/                        # shadcn/ui generated components (Button, Input, Label, etc.)
├── layouts/
│   └── AppLayout.tsx              # Authenticated shell — placeholder (sidebar + topbar added later)
├── router/
│   └── index.tsx                  # RouterProvider, route definitions, ProtectedRoute/PublicRoute
├── lib/
│   ├── axios.ts                   # Axios instance with request/response interceptors
│   └── utils.ts                   # shadcn cn() helper (tailwind-merge + clsx)
├── App.tsx                        # Renders <RouterProvider>
├── main.tsx                       # Entry point — unchanged
└── index.css                      # Extended with Tailwind @import directive
```

Future features follow the same pattern:
```
features/
├── auth/
├── thesis/
│   ├── components/
│   ├── hooks/
│   └── api.ts
└── users/
    ├── components/
    └── api.ts
```

---

## 3. Auth State (Zustand)

**Store: `src/features/auth/store/authStore.ts`**

```ts
interface AuthState {
  user: { id: number; username: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT'; fullName: string | null; email: string | null } | null;
  accessToken: string | null;
  setAuth: (user: AuthState['user'], accessToken: string) => void;
  clearAuth: () => void;
}
```

- `user` and `accessToken` are held in JS memory only — lost on page refresh (intentional; access token is short-lived).
- On page load, a silent refresh is attempted before rendering anything (see Section 5).

---

## 4. Backend Changes

Three small changes to `backend/src/auth/auth.controller.ts` and `auth.service.ts`:

### `POST /auth/login`
- **Before:** returns `{ accessToken, refreshToken, user }` in body.
- **After:** sets `refreshToken` as an httpOnly, `SameSite=Strict`, `Path=/auth/refresh` cookie. Returns `{ accessToken, user }` in body (no `refreshToken` in body).

### `POST /auth/refresh`
- **Before:** reads `refreshToken` from request body.
- **After:** reads `refreshToken` from the cookie. Request body no longer needed. Returns `{ accessToken }` in body and rotates the cookie.

### `POST /auth/logout`
- **Before:** clears `User.refreshToken` in DB.
- **After:** also clears the cookie by setting it with `maxAge=0`.

Cookie config:
```ts
res.cookie('refreshToken', token, {
  httpOnly: true,
  sameSite: 'strict',
  path: '/',  // Path=/ so cookie is sent regardless of /api proxy prefix in dev
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
});
```

---

## 5. HTTP Client (`src/lib/axios.ts`)

- **Base URL:** `/api` (Vite dev proxy forwards to `http://localhost:3000`)
- **Vite proxy config** (`vite.config.ts`): add `server.proxy: { '/api': 'http://localhost:3000' }`

**Request interceptor:**  
Reads `accessToken` from Zustand store → attaches `Authorization: Bearer <token>` header.

**Response interceptor (401 handling):**  
1. On 401 response, call `POST /api/auth/refresh` (cookie sent automatically by browser).  
2. If refresh succeeds → update store with new `accessToken` → retry original request once.  
3. If refresh fails → `clearAuth()` → redirect to `/login`.  
4. Guard against refresh loop: don't intercept 401s from the refresh endpoint itself.

**Silent restore on app load:**  
In `App.tsx`, before rendering the router, attempt `POST /api/auth/refresh` once. On success, populate the store. On failure, proceed to login. Show a loading spinner while this is in flight so users don't see a flash of the login page.

---

## 6. Routing

**File: `src/router/index.tsx`**

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginPage` | Public — redirects to `/` if already authenticated |
| `/` | `AppLayout` | Protected — redirects to `/login` if not authenticated |
| `*` | Redirect → `/login` | — |

**`ProtectedRoute`:** reads `user` from Zustand store. If `null` → `<Navigate to="/login" replace />`. Otherwise → `<Outlet />`.

**`PublicRoute`:** reads `user` from Zustand store. If not `null` → `<Navigate to="/" replace />`. Otherwise → `<Outlet />`.

---

## 7. Login Page

**File: `src/features/auth/components/LoginPage.tsx`**

### Layout
Two-column split layout (full viewport height):

**Left panel** (~40% width) — branded, darker background using `--accent` color:
- Placeholder icon (replaced by school logo later)
- University name: **"International University"**
- Department: **"Faculty of Information Technology"**
- Tagline: **"Thesis Management System"**

**Right panel** (~60% width) — white/light background:
- Heading: **"Welcome back"**
- Subtext: **"Sign in to your account to continue"**
- Form fields (shadcn `Input` + `Label`):
  - Username
  - Password (type=password)
- **"Sign in"** button (shadcn `Button`, full width, primary)
- Inline error message below the button on failed login (e.g. "Invalid username or password")
- Button shows loading state (disabled + spinner) while request is in flight

### Login flow
1. User submits form → `POST /api/auth/login` with `{ username, password }`.
2. On success (201): store `accessToken` + `user` in Zustand → `navigate('/')`.
3. On 401: show error message "Invalid username or password".
4. On other errors: show generic error "Something went wrong. Please try again."

### Responsive
On mobile (< 768px): hide the left panel, show only the right panel (form).

---

## 8. AppLayout (Placeholder)

**File: `src/layouts/AppLayout.tsx`**

For now, just a minimal authenticated shell — a topbar showing the logged-in user's name and role, and a "Sign out" button that calls `POST /api/auth/logout` then `clearAuth()` and redirects to `/login`. The sidebar and full navigation will be added in future feature specs.

---

## Out of Scope

- Any feature pages (thesis management, user management, etc.)
- Role-based navigation or role-specific dashboards
- Dark mode toggle (CSS variables support it passively via `prefers-color-scheme`)
