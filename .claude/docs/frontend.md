# Frontend — React + Vite

## Source Structure

```
frontend/src/
├── features/               # Feature-based modules
│   └── auth/
│       ├── components/
│       │   └── LoginPage.tsx       # Split-layout login page
│       ├── store/
│       │   └── authStore.ts        # Zustand auth store (user + accessToken in memory)
│       └── api.ts                  # Auth API calls (login, refresh, logout, me)
├── components/
│   └── ui/                         # shadcn/ui generated components (Button, Input, Label, etc.)
├── layouts/
│   └── AppLayout.tsx               # Authenticated shell (topbar + Outlet for child routes)
├── router/
│   ├── index.tsx                   # createBrowserRouter — route definitions
│   └── guards.tsx                  # ProtectedRoute, PublicRoute wrappers
├── lib/
│   ├── axios.ts                    # Axios instance with Bearer token injection + 401 refresh interceptor
│   └── utils.ts                    # shadcn cn() helper (clsx + tailwind-merge)
├── App.tsx                         # Silent session restore on mount → RouterProvider
├── main.tsx                        # Entry point — renders <App /> into #root with StrictMode
└── index.css                       # Tailwind import + shadcn CSS variable theme
```

**Pattern:** New features go under `src/features/<feature-name>/` with `components/`, `hooks/`, `api.ts` sub-folders.

## Build Tooling

- **Vite 8.x** with `@vitejs/plugin-react` and `@tailwindcss/vite` — fast HMR, ESM-based dev server
- **TypeScript 6.x** — stricter than backend's TS 5.x
- Config: `vite.config.ts` (React + Tailwind plugins, `/api` proxy)

## Naming Conventions

- **Component files**: PascalCase — `LoginPage.tsx`, `AppLayout.tsx`
- **Non-component files**: camelCase — `axios.ts`, `authStore.ts`, `api.ts`
- **CSS files**: match component name — `LoginPage.css` or CSS modules `LoginPage.module.css`
- **Directories**: camelCase or kebab-case for feature folders

## Design System

All UI must follow the **Scholarly Editorial** design spec — see [design-system.md](design-system.md). Key rules:

- **Colors**: Oxford Blue (`#00346d`) primary, tonal surface layering instead of borders
- **Typography**: Newsreader (headings) + Manrope (body) + Inter (labels) — load via Google Fonts
- **No borders**: Use background shifts between surface tiers to define structure
- **No card shadows**: Use `surface_container_lowest` background shift instead
- **CTA buttons**: 135° gradient from `#00346d` → `#004b97`

## Styling

Tailwind CSS v4 (via Vite plugin — no `tailwind.config.js` needed) + shadcn/ui.

- `@import "tailwindcss"` in `index.css` enables all utilities
- shadcn CSS variable theme is in `index.css` (violet primary color, oklch-based)
- Light/dark theme via `.dark` class (shadcn convention) and `prefers-color-scheme`
- `@/*` path alias maps to `src/` — both `@/components/ui/button` and relative imports work

## Routing

React Router v7 (`react-router` package):

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginPage` | `PublicRoute` — redirects to `/` if already authenticated |
| `/` | `AppLayout` | `ProtectedRoute` — redirects to `/login` if not authenticated |
| `*` | Redirect → `/login` | — |

Guards live in `src/router/guards.tsx` (separate from route config to satisfy react-refresh ESLint rule).

## Auth State

Zustand store (`src/features/auth/store/authStore.ts`):

```typescript
interface AuthState {
  user: UserProfile | null      // in JS memory (lost on page refresh — intentional)
  accessToken: string | null    // in JS memory
  setAuth(user, accessToken)    // called on login or session restore
  setAccessToken(token)         // called by Axios interceptor on silent refresh
  clearAuth()                   // called on logout or refresh failure
}
```

## HTTP Client

Axios instance at `src/lib/axios.ts`:

- **Base URL**: `/api` (proxied to `http://localhost:3000` by Vite in dev)
- **Credentials**: `withCredentials: true` — sends httpOnly refresh token cookie automatically
- **Request interceptor**: attaches `Authorization: Bearer <accessToken>` from store
- **Response interceptor**: on 401, silently refreshes via `POST /api/auth/refresh`, updates store, retries original request once. On refresh failure: `clearAuth()` + redirect to `/login`.
- Queues concurrent requests during an in-flight refresh (`waitQueue`).

**App.tsx silent restore**: on mount, calls raw `axios` (not the custom instance) to `POST /api/auth/refresh` then `GET /api/auth/me`. Populates store on success. Shows loading spinner until complete so users don't see a flash of the login page.

## API Integration

All auth API calls go through `src/features/auth/api.ts` (`authApi.login/refresh/logout/me`). Future features add their own `src/features/<feature>/api.ts`.

Vite proxy config (`vite.config.ts`):
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
},
```

## shadcn/ui

Components in `src/components/ui/`. Add new ones with:
```bash
cd frontend
npx shadcn@latest add <component-name>
```

Components use `@/lib/utils` (the `cn()` helper). Style: Default, Color: Violet (manually set).

## Gotchas

- **react-router v7** — import from `react-router`, not `react-router-dom`.
- **Tailwind v4** — uses `@tailwindcss/vite` plugin; no `tailwind.config.js` needed. Enable with `@import "tailwindcss"` in CSS.
- **shadcn init** — "Violet" is not a valid base color in shadcn v4 (only neutral tones). Use zinc, then manually set `--primary` to violet oklch in `index.css`. Also move `shadcn` from `dependencies` to `devDependencies` after init.
- **react-refresh ESLint rule** — component files cannot mix component and non-component exports. Router guard components must live in a separate file (e.g. `guards.tsx`), not alongside the `router` config object.
