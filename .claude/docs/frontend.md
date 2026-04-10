# Frontend — React + Vite

## Source Structure

```
frontend/src/
├── main.tsx        # Entry point — renders <App /> into #root with StrictMode
├── App.tsx         # Root component (currently starter template)
├── App.css         # Component-scoped styles
├── index.css       # Global styles and CSS custom properties
└── assets/         # Static assets (images, SVGs)
```

## Build Tooling

- **Vite 8.x** with `@vitejs/plugin-react` — fast HMR, ESM-based dev server
- **TypeScript 6.x** — stricter than backend's TS 5.x
- Config: `vite.config.ts` (minimal — just React plugin)

## Naming Conventions

- **Component files**: PascalCase — `ThesisForm.tsx`
- **Non-component files**: camelCase — `apiClient.ts`, `useThesis.ts`
- **CSS files**: match component name — `ThesisForm.css` or use CSS modules `ThesisForm.module.css`
- **Directories**: camelCase or kebab-case for feature folders

## Styling

The project uses plain CSS with CSS custom properties (no CSS framework yet):

- **Light/dark theme**: via `prefers-color-scheme` media query in `index.css`
- **CSS variables** defined on `:root`: `--text`, `--bg`, `--accent`, `--border`, etc.
- **Fonts**: system font stacks (`--sans`, `--heading`, `--mono`)

### Color Palette (from index.css)

| Variable       | Light           | Dark             |
|----------------|-----------------|------------------|
| `--text`       | `#6b6375`       | `#9ca3af`        |
| `--text-h`     | `#08060d`       | `#f3f4f6`        |
| `--bg`         | `#fff`          | `#16171d`        |
| `--accent`     | `#aa3bff`       | `#c084fc`        |
| `--border`     | `#e5e4e7`       | `#2e303a`        |

## Routing (Not Yet Configured)

No router is installed yet. When adding one, use `react-router` v7+.

## State Management (Not Yet Configured)

Currently just `useState`. As the app grows, consider:
- React context for auth/user state
- A data-fetching library like TanStack Query for server state

## API Integration (Not Yet Configured)

No HTTP client is configured. When connecting to the backend:
- Configure Vite proxy in `vite.config.ts` to forward `/api` to backend
- Use `fetch` or install `axios` / `ky`
