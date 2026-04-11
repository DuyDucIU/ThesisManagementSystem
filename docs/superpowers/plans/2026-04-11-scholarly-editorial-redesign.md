# Scholarly Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Scholarly Editorial design system (Oxford Blue palette, tri-font system, tonal surface layering, gradient CTAs, floating nav) to the two existing UI pages: LoginPage and AppLayout.

**Architecture:** Three files change in sequence — `index.css` first (global tokens), then the two page components. CSS custom properties and Tailwind `@theme` tokens are the mechanism: updating them once propagates through all shadcn components automatically. No new components are introduced.

**Tech Stack:** Tailwind CSS v4 (`@theme`/`@theme inline`), shadcn/ui CSS variables, Google Fonts (Newsreader, Manrope, Inter), React + TypeScript.

---

## Files

| File | Change |
|------|--------|
| `frontend/index.html` | Add Google Fonts `<link>` tags, update page title |
| `frontend/src/index.css` | Remove Geist import, remap shadcn tokens, add surface/font `@theme` tokens |
| `frontend/src/features/auth/components/LoginPage.tsx` | Oxford Blue panel, Newsreader heading, gradient button, Inter labels |
| `frontend/src/layouts/AppLayout.tsx` | Backdrop-blur topbar, Newsreader logo, role badge, remove border |

---

### Task 1: CSS Foundation

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add Google Fonts to `frontend/index.html`**

Replace the current `<head>` content with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thesis Management System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Manrope:wght@400;500;600&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Rewrite `frontend/src/index.css`**

Replace the entire file with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

:root {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  --background: #f8f9fa;
  --foreground: #191c1d;
  --card: #f8f9fa;
  --card-foreground: #191c1d;
  --popover: #ffffff;
  --popover-foreground: #191c1d;
  --primary: #00346d;
  --primary-foreground: #ffffff;
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.145 0 0 / 20%);
  --input: oklch(0.145 0 0 / 20%);
  --ring: #00346d;
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: #f3f4f5;
  --sidebar-foreground: #191c1d;
  --sidebar-primary: #00346d;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e8eaeb;
  --sidebar-accent-foreground: #191c1d;
  --sidebar-border: oklch(0.145 0 0 / 20%);
  --sidebar-ring: #00346d;
}

body {
  margin: 0;
}

#root {
  min-height: 100svh;
}

@theme inline {
  --font-display: 'Newsreader', Georgia, serif;
  --font-sans: 'Manrope', system-ui, sans-serif;
  --font-label: 'Inter', system-ui, sans-serif;
  --color-ring-offset-background: var(--background);
  --color-destructive-foreground: oklch(0.985 0 0);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

@theme {
  --color-surface: #f8f9fa;
  --color-surface-container-low: #f3f4f5;
  --color-surface-container: #e8eaeb;
  --color-surface-container-high: #e1e3e4;
  --color-surface-container-highest: #d8dadb;
  --color-primary-container: #004b97;
  --color-tertiary: #003c3b;
  --color-on-surface: #191c1d;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.145 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 3: Remove the unused Geist font package**

```bash
cd frontend
pnpm remove @fontsource-variable/geist
```

- [ ] **Step 4: Verify fonts load**

```bash
cd frontend
pnpm run dev
```

Open `http://localhost:5173/login`. Open DevTools → Network → filter by "fonts.gstatic.com". Confirm Newsreader, Manrope, and Inter are loading. The login page background should now be `#f8f9fa` (off-white) instead of white.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add index.html src/index.css package.json pnpm-lock.yaml
git commit -m "Apply Scholarly Editorial design tokens: fonts, colors, surface tiers"
```

---

### Task 2: Redesign LoginPage

**Files:**
- Modify: `frontend/src/features/auth/components/LoginPage.tsx`

- [ ] **Step 1: Replace `LoginPage.tsx` with the redesigned version**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
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
    <div className="flex h-screen bg-surface">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden md:flex md:w-2/5 bg-primary flex-col items-center justify-center text-white p-12 gap-4">
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
        <h1 className="font-display text-2xl font-semibold text-center">International University</h1>
        <p className="font-sans text-white/80 text-center">Faculty of Information Technology</p>
        <p className="font-sans text-white/60 text-sm text-center mt-1">Thesis Management System</p>
      </div>

      {/* Right login panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-[2.5rem] font-semibold text-on-surface leading-tight">
              Welcome back
            </h2>
            <p className="font-sans text-base text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username" className="font-label text-xs font-medium">
                Username
              </Label>
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
              <Label htmlFor="password" className="font-label text-xs font-medium">
                Password
              </Label>
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
              <p className="font-sans text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90 transition-opacity font-sans"
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

With `pnpm run dev` running, open `http://localhost:5173/login`. Confirm:
- Left panel is Oxford Blue (`#00346d`), not violet
- "Welcome back" heading renders in Newsreader serif
- Labels ("Username", "Password") render in Inter at small size
- Input borders are soft/ghost (low opacity grey), not the previous solid grey
- "Sign in" button shows a blue gradient (dark navy → medium blue), not flat

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/auth/components/LoginPage.tsx
git commit -m "Redesign LoginPage: Oxford Blue panel, Newsreader heading, gradient button"
```

---

### Task 3: Redesign AppLayout Topbar

**Files:**
- Modify: `frontend/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Replace `AppLayout.tsx` with the redesigned version**

```tsx
import { useNavigate, Outlet } from 'react-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authApi } from '../features/auth/api'
import { Button } from '../components/ui/button'

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  LECTURER: 'bg-tertiary/10 text-tertiary',
  STUDENT: 'bg-surface-container-high text-on-surface',
}

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
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 backdrop-blur-[12px] bg-surface/80 px-6 py-4 flex items-center justify-between">
        <span className="font-display text-xl font-semibold text-primary">
          Thesis Management System
        </span>
        <div className="flex items-center gap-4">
          <span className="font-sans text-sm text-on-surface">{user?.username}</span>
          {user?.role && (
            <span
              className={`font-label text-xs font-medium px-2.5 py-0.5 rounded-full ${roleBadgeClass[user.role] ?? 'bg-surface-container-high text-on-surface'}`}
            >
              {user.role}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="font-label text-sm">
            Sign out
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Log in with valid credentials to reach the app shell. Confirm:
- No border line below the topbar — boundary is defined by background contrast only
- "Thesis Management System" logo renders in Newsreader serif, Oxford Blue
- Username is in Manrope
- Role badge is a pill with muted tones (ADMIN = light blue, LECTURER = teal tint, STUDENT = grey)
- Scroll the page (add temporary content if needed) — topbar should blur the content behind it

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/layouts/AppLayout.tsx
git commit -m "Redesign AppLayout topbar: backdrop blur, Newsreader logo, role badge"
```
