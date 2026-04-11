# Frontend Foundation & Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the frontend foundation (Tailwind v4, shadcn/ui, React Router, Zustand, Axios) and implement the login page with httpOnly cookie-based refresh token storage.

**Architecture:** Feature-based folder structure under `src/features/`. Auth state lives in a Zustand store in memory; access token is stored there, refresh token is an httpOnly cookie managed by the backend. Axios intercepts 401s to silently refresh tokens before retrying. App.tsx attempts a silent refresh on load to restore sessions.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, shadcn/ui, React Router v7, Zustand, Axios, NestJS (backend cookie changes), cookie-parser.

---

## File Map

### Backend — modified files
| File | Change |
|------|--------|
| `backend/src/main.ts` | Add `cookie-parser` middleware + CORS with credentials |
| `backend/src/auth/auth.controller.ts` | Login sets cookie, refresh reads cookie, logout clears cookie |
| `backend/src/auth/dto/refresh.dto.ts` | Delete — no longer needed (token now comes from cookie) |
| `backend/src/auth/auth.controller.spec.ts` | Update tests for cookie-aware controller |

### Frontend — new files
| File | Responsibility |
|------|---------------|
| `frontend/src/lib/utils.ts` | shadcn `cn()` helper (clsx + tailwind-merge) |
| `frontend/src/features/auth/store/authStore.ts` | Zustand store: user + accessToken in memory |
| `frontend/src/features/auth/api.ts` | Auth API calls: login, refresh, logout, me |
| `frontend/src/lib/axios.ts` | Axios instance with token injection + 401 refresh interceptor |
| `frontend/src/router/index.tsx` | Router, ProtectedRoute, PublicRoute |
| `frontend/src/layouts/AppLayout.tsx` | Authenticated shell with topbar + sign-out |
| `frontend/src/features/auth/components/LoginPage.tsx` | Split-layout login page |

### Frontend — modified files
| File | Change |
|------|--------|
| `frontend/vite.config.ts` | Add Tailwind plugin + `/api` proxy to backend |
| `frontend/src/index.css` | Replace with Tailwind import + CSS variables |
| `frontend/src/App.tsx` | Silent refresh on mount + RouterProvider |

---

## Task 1: Backend — install cookie-parser and configure CORS

**Files:**
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Install cookie-parser in the backend**

```bash
cd backend
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

Expected: packages added to `backend/package.json`.

- [ ] **Step 2: Update main.ts**

Replace the full content of `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 3: Verify the backend still starts**

```bash
cd backend
pnpm run start:dev
```

Expected: server starts on port 3000 with no errors.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/main.ts package.json pnpm-lock.yaml
git commit -m "Add cookie-parser middleware and CORS config"
```

---

## Task 2: Backend — update auth controller for httpOnly cookies

**Files:**
- Modify: `backend/src/auth/auth.controller.ts`
- Delete: `backend/src/auth/dto/refresh.dto.ts`

The service layer (`auth.service.ts`) does not change — it still accepts/returns token strings. Only the controller changes how tokens are transported.

- [ ] **Step 1: Delete the RefreshDto file**

Delete `backend/src/auth/dto/refresh.dto.ts` — the refresh token now comes from a cookie, not a request body.

- [ ] **Step 2: Replace auth.controller.ts**

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto.username,
      dto.password,
    );
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken, user };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const { accessToken, refreshToken } = await this.authService.refresh(token);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: { id: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie('refreshToken', { path: '/' });
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: number }) {
    return this.authService.getMe(user.id);
  }
}
```

- [ ] **Step 3: Verify the backend builds**

```bash
cd backend
pnpm run build
```

Expected: builds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/auth/auth.controller.ts
git rm src/auth/dto/refresh.dto.ts
git commit -m "Update auth controller to use httpOnly cookie for refresh token"
```

---

## Task 3: Backend — update auth controller tests

**Files:**
- Modify: `backend/src/auth/auth.controller.spec.ts`

- [ ] **Step 1: Replace the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockProfile = {
    id: 1,
    username: 'john.doe',
    role: 'STUDENT',
    fullName: 'John Doe',
    email: 'john@uni.edu',
  };
  const mockLoginResult = {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    user: mockProfile,
  };

  const mockRes = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            getMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('login sets refreshToken cookie and returns accessToken + user', async () => {
    authService.login.mockResolvedValue(mockLoginResult as any);
    const res = mockRes();

    const result = await controller.login(
      { username: 'john.doe', password: 'secret' },
      res as any,
    );

    expect(authService.login).toHaveBeenCalledWith('john.doe', 'secret');
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh.token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ accessToken: 'access.token', user: mockProfile });
  });

  it('refresh reads cookie, rotates it, and returns new accessToken', async () => {
    const tokens = { accessToken: 'new.access', refreshToken: 'new.refresh' };
    authService.refresh.mockResolvedValue(tokens);
    const res = mockRes();
    const req = { cookies: { refreshToken: 'old.refresh.token' } };

    const result = await controller.refresh(req as any, res as any);

    expect(authService.refresh).toHaveBeenCalledWith('old.refresh.token');
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new.refresh',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ accessToken: 'new.access' });
  });

  it('refresh throws 401 when cookie is missing', async () => {
    const res = mockRes();
    const req = { cookies: {} };

    await expect(controller.refresh(req as any, res as any)).rejects.toThrow(
      new UnauthorizedException('Missing refresh token'),
    );
  });

  it('logout clears cookie and calls authService.logout', async () => {
    authService.logout.mockResolvedValue(undefined);
    const res = mockRes();

    await controller.logout({ id: 42 } as any, res as any);

    expect(authService.logout).toHaveBeenCalledWith(42);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/' });
  });

  it('getMe calls authService.getMe with userId and returns profile', async () => {
    authService.getMe.mockResolvedValue(mockProfile as any);

    const result = await controller.getMe({ id: 1 } as any);

    expect(authService.getMe).toHaveBeenCalledWith(1);
    expect(result).toBe(mockProfile);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd backend
pnpm run test auth.controller
```

Expected output: 5 tests pass.

- [ ] **Step 3: Run the full test suite**

```bash
cd backend
pnpm run test
```

Expected: all tests pass (no regressions in auth.service.spec.ts).

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/auth/auth.controller.spec.ts
git commit -m "Update auth controller tests for cookie-based refresh"
```

---

## Task 4: Frontend — install dependencies

**Files:**
- Modify: `frontend/package.json` (via pnpm add)

- [ ] **Step 1: Install runtime dependencies**

```bash
cd frontend
pnpm add tailwindcss @tailwindcss/vite react-router zustand axios
```

- [ ] **Step 2: Verify package.json has the new dependencies**

```bash
cd frontend
cat package.json
```

Expected: `tailwindcss`, `@tailwindcss/vite`, `react-router`, `zustand`, `axios` appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add package.json pnpm-lock.yaml
git commit -m "Add tailwindcss, react-router, zustand, axios to frontend"
```

---

## Task 5: Frontend — Tailwind v4 and Vite proxy setup

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

The proxy rewrites `/api/auth/login` → `/auth/login` when forwarding to the backend.

- [ ] **Step 2: Replace index.css**

Replace the full contents of `frontend/src/index.css` with:

```css
@import "tailwindcss";

:root {
  --sans: system-ui, 'Segoe UI', Roboto, sans-serif;
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
}

#root {
  min-height: 100svh;
}
```

The old Vite starter styles are removed — Tailwind provides the utility classes and shadcn will add CSS variables for its component themes.

- [ ] **Step 3: Start the dev server to verify Tailwind loads**

```bash
cd frontend
pnpm run dev
```

Expected: dev server starts on port 5173 with no errors in the console.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add vite.config.ts src/index.css
git commit -m "Configure Tailwind v4 and Vite API proxy"
```

---

## Task 6: Frontend — initialize shadcn/ui and add components

**Files:**
- Create: `frontend/src/lib/utils.ts` (created by shadcn init)
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Modify: `frontend/src/index.css` (shadcn adds CSS variables)

- [ ] **Step 1: Run shadcn init**

```bash
cd frontend
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Violet** (closest to the existing `--accent: #aa3bff` purple)
- CSS variables: **Yes**

shadcn will create `src/lib/utils.ts`, update `index.css` with CSS variable theme, and install `clsx` and `tailwind-merge`.

- [ ] **Step 2: Add Button, Input, and Label components**

```bash
cd frontend
npx shadcn@latest add button input label
```

Expected: creates `src/components/ui/button.tsx`, `input.tsx`, `label.tsx`.

- [ ] **Step 3: Verify the dev server still runs**

```bash
cd frontend
pnpm run dev
```

Expected: starts on 5173 with no errors.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/lib/utils.ts src/components/ src/index.css package.json pnpm-lock.yaml
git commit -m "Initialize shadcn/ui with button, input, label components"
```

---

## Task 7: Frontend — Zustand auth store

**Files:**
- Create: `frontend/src/features/auth/store/authStore.ts`

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p frontend/src/features/auth/store
mkdir -p frontend/src/features/auth/components
```

- [ ] **Step 2: Create authStore.ts**

```typescript
import { create } from 'zustand'

export interface UserProfile {
  id: number
  username: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  fullName: string | null
  email: string | null
}

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  setAuth: (user: UserProfile, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/
git commit -m "Add Zustand auth store with user and accessToken"
```

---

## Task 8: Frontend — auth API module

**Files:**
- Create: `frontend/src/features/auth/api.ts`

This module makes all auth-related HTTP calls. It imports the axios instance (created in Task 9), so for now we write it and it will be resolved once axios.ts exists.

- [ ] **Step 1: Create src/features/auth/api.ts**

```typescript
import api from '../../lib/axios'
import type { UserProfile } from './store/authStore'

export interface LoginResponse {
  accessToken: string
  user: UserProfile
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),

  refresh: () =>
    api.post<{ accessToken: string }>('/auth/refresh'),

  logout: () =>
    api.post<void>('/auth/logout'),

  me: () =>
    api.get<UserProfile>('/auth/me'),
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/features/auth/api.ts
git commit -m "Add auth API module (login, refresh, logout, me)"
```

---

## Task 9: Frontend — Axios instance with interceptors

**Files:**
- Create: `frontend/src/lib/axios.ts`

- [ ] **Step 1: Create src/lib/axios.ts**

```typescript
import axios from 'axios'
import { useAuthStore } from '../features/auth/store/authStore'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Attach access token from store to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: attempt silent refresh, retry original request once
let isRefreshing = false
let waitQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function drainQueue(err: unknown, token: string | null) {
  waitQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  waitQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    const is401 = error.response?.status === 401
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh')
    const alreadyRetried = original?._retry === true

    if (!is401 || isRefreshEndpoint || alreadyRetried) {
      return Promise.reject(error)
    }

    // Queue requests that arrive while a refresh is in progress
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const res = await api.post<{ accessToken: string }>('/auth/refresh')
      const { accessToken } = res.data
      const { user } = useAuthStore.getState()
      if (user) {
        useAuthStore.getState().setAuth(user, accessToken)
      }
      original.headers.Authorization = `Bearer ${accessToken}`
      drainQueue(null, accessToken)
      return api(original)
    } catch (refreshError) {
      drainQueue(refreshError, null)
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/lib/axios.ts
git commit -m "Add Axios instance with Bearer token injection and 401 refresh interceptor"
```

---

## Task 10: Frontend — Router with ProtectedRoute and PublicRoute

**Files:**
- Create: `frontend/src/router/index.tsx`

- [ ] **Step 1: Create src/router/index.tsx**

```typescript
import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import LoginPage from '../features/auth/components/LoginPage'
import AppLayout from '../layouts/AppLayout'

function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function PublicRoute() {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/', element: <AppLayout /> }],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/router/
git commit -m "Add React Router setup with ProtectedRoute and PublicRoute"
```

---

## Task 11: Frontend — AppLayout placeholder

**Files:**
- Create: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Create src/layouts/AppLayout.tsx**

```typescript
import { useNavigate } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authApi } from '../features/auth/api'
import { Button } from '../components/ui/button'

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — still clear local state
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Thesis Management System</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.username}{' '}
            <span className="text-xs text-gray-400">({user?.role})</span>
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="p-6">
        <p className="text-gray-400 text-sm">Dashboard — coming soon</p>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/layouts/
git commit -m "Add AppLayout placeholder with topbar and sign-out"
```

---

## Task 12: Frontend — LoginPage

**Files:**
- Create: `frontend/src/features/auth/components/LoginPage.tsx`

- [ ] **Step 1: Create LoginPage.tsx**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await authApi.login(username, password)
      setAuth(res.data.user, res.data.accessToken)
      navigate('/')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid username or password.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden md:flex md:w-2/5 bg-violet-700 flex-col items-center justify-center text-white p-12 gap-4">
        {/* Placeholder logo */}
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-center">International University</h1>
        <p className="text-violet-200 text-center">Faculty of Information Technology</p>
        <p className="text-violet-300 text-sm text-center mt-1">Thesis Management System</p>
      </div>

      {/* Right login panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add src/features/auth/components/LoginPage.tsx
git commit -m "Add login page with split layout and form validation"
```

---

## Task 13: Frontend — App.tsx with silent refresh and RouterProvider

**Files:**
- Modify: `frontend/src/App.tsx`

On mount, App.tsx attempts to restore the session by calling `/api/auth/refresh` (the httpOnly cookie is sent automatically). If it succeeds, it fetches `/auth/me` to get the user profile and populates the store. Only then is the router rendered.

- [ ] **Step 1: Replace App.tsx**

```typescript
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import axios from 'axios'
import router from './router'
import { useAuthStore } from './features/auth/store/authStore'
import type { UserProfile } from './features/auth/store/authStore'

export default function App() {
  const [ready, setReady] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Use raw axios so we don't go through the store interceptor during init
        const refreshRes = await axios.post<{ accessToken: string }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true },
        )
        const { accessToken } = refreshRes.data

        const meRes = await axios.get<UserProfile>('/api/auth/me', {
          withCredentials: true,
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        setAuth(meRes.data, accessToken)
      } catch {
        // No active session — user will see login page
      } finally {
        setReady(true)
      }
    }

    restoreSession()
  }, [setAuth])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: Run the frontend dev server and backend together**

In one terminal:
```bash
cd backend && pnpm run start:dev
```

In another:
```bash
cd frontend && pnpm run dev
```

- [ ] **Step 3: Smoke test the full flow**

1. Open `http://localhost:5173` — should redirect to `/login`.
2. Enter wrong credentials — should show "Invalid username or password."
3. Enter correct credentials (check the DB seed for a valid user) — should redirect to `/`.
4. Verify the topbar shows the username and role.
5. Click "Sign out" — should redirect to `/login`.
6. Log in again, then refresh the browser tab — should restore the session automatically (silent refresh from cookie).

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/App.tsx
git commit -m "Add silent session restore on app load via refresh cookie"
```

---

## Self-Review Notes

- All 8 spec sections are covered: deps (Tasks 4–6), auth state (Task 7), backend cookie changes (Tasks 1–3), HTTP client (Task 9), routing (Task 10), login page (Task 12), AppLayout (Task 11), App.tsx restore (Task 13).
- The refresh interceptor in `axios.ts` guards against loop (checks `isRefreshEndpoint` and `_retry` flag).
- Silent restore in `App.tsx` uses raw axios with an explicit header to avoid a circular dependency with the store interceptor.
- Mobile responsive: left panel hidden below `md` breakpoint — right panel fills full width.
- Cookie `path: '/'` ensures the cookie is sent for all API paths (important because Vite proxies to `/api/*`).
