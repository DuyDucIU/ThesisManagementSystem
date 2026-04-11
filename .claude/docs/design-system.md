# Design System — The Scholarly Editorial

## 1. Overview

**Creative North Star: The Digital Curator**

This design system moves away from the "industrial dashboard" aesthetic common in academic software. Instead, it adopts a "High-End Editorial" approach — treating thesis management not as a series of database entries, but as a prestigious collection of intellectual property.

The system uses **intentional asymmetry** and **tonal depth**: an expansive typographic scale and layered surfaces that feel authoritative yet breathable — mimicking a premium academic journal or well-curated archive.

---

## 2. Colors & Surface Philosophy

The palette is rooted in "Trustworthy Blues" and "Subtle Greys," executed with a sophisticated layering technique.

### Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#00346d` | "Oxford" Blue — high-authority moments |
| `primary_container` | `#004b97` | Active states, subtle brand accents |
| `tertiary` | `#003c3b` | Deep Forest Teal — success states, Scholar role highlights |
| `surface` | `#f8f9fa` | Base canvas |
| `surface_container_low` | `#f3f4f5` | Secondary sections |
| `surface_container_highest` | `#e1e3e4` | Tertiary utility areas (sidebars) |
| `on_surface` | `#191c1d` | Body text — never use pure `#000000` |

### The "No-Line" Rule

**Do not use 1px solid borders to section content.** Structure is defined through background shifts. A card (`surface_container_lowest`) sits atop a section (`surface_container_low`) — the contrast between hex values provides the boundary. This creates a softer, more integrated "editorial" feel.

### CTA Gradients

Use a subtle linear gradient from `primary` (#00346d) to `primary_container` (#004b97) at **135 degrees** for primary action buttons.

### Floating Navigation

Apply `backdrop-blur: 12px` and **80% opacity** on `surface_container_lowest` for sticky/floating headers. Content bleeds through softly as the user scrolls.

---

## 3. Typography

A tri-font system establishing a clear scholarly hierarchy. Load all three via Google Fonts.

| Role | Font | Weights | Use for |
|------|------|---------|---------|
| Display & Headlines | **Newsreader** (Serif) | 400, 600 | Page titles, major headings — signals prestige |
| Titles & Body | **Manrope** (Geometric Sans) | 400, 500, 600 | Card headers, body text, thesis abstracts |
| Labels | **Inter** (Utilitarian Sans) | 400, 500 | Status badges, table headers, small-scale UI |

### Scale

| Name | Font | Size | Weight | Use |
|------|------|------|--------|-----|
| `display-md` | Newsreader | 2.5rem | 600 | Page titles (e.g. "Thesis Submission") |
| `title-lg` | Manrope | 1.25rem | 600 | Card headers |
| `title-sm` | Manrope | 1rem | 600 | Section labels, upload prompts |
| `body-lg` | Manrope | 1rem | 400 | Thesis abstracts, main body |
| `body-sm` | Manrope | 0.875rem | 400 | Supporting info, file constraints |
| `label-md` | Inter | 0.75rem | 500 | Status badges, table column headers |

---

## 4. Elevation & Depth

Hierarchy is achieved through **tonal layering**, not drop shadows.

### Layering Levels

| Level | Token | Used for |
|-------|-------|---------|
| 0 | `surface` (#f8f9fa) | The floor / page background |
| 1 | `surface_container_low` (#f3f4f5) | Section backgrounds |
| 2 | `surface_container_lowest` | Cards, interaction areas |

### Shadows (Modals only)

For floating modals (e.g., "Upload Document"): `box-shadow: 0 0 32px 0 rgba(25,28,29,0.06)`. Mimics natural light on high-quality paper. **Do not use shadows on cards** — use background shift instead.

### Ghost Borders

If a form input requires a visible boundary: use `outline_variant` at **20% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Status Badges ("Scholarly Seal")

Muted tones only — no bright "traffic light" colors. Pill shape (`border-radius: 9999px`), `label-md` (Inter) typography.

| State | Background | Text |
|-------|------------|------|
| Active | `primary_fixed` | `on_primary_fixed` |
| Pending | `secondary_fixed` | `on_secondary_fixed` |
| Rejected | `error_container` | `on_error_container` |

### Data Tables ("The Archive")

- **No horizontal dividers between rows.**
- Use `padding: 1rem 0` (spacing.4) vertical padding per row.
- On hover: change row background to `surface_container_high`.
- Column headers: `label-md` (Inter), uppercase or small-caps.

### Document Upload ("The Depository")

- Container: `surface_container_low` background, `border-radius: 0.5rem` (roundedness.lg)
- Border: dashed, `outline_variant` at 20% opacity
- Primary label: `title-sm` (Manrope) — e.g. "Drop Thesis PDF here"
- Supporting text: `body-sm` (Manrope) — file constraints

### Role-Based Navigation

| Role | Navigation Style |
|------|-----------------|
| Student | `surface_container_lowest` main workspace — clean, focused |
| Lecturer / Admin | `surface_container_highest` sidebar — dense management links, "Control Center" feel |

---

## 6. Do's and Don'ts

### Do
- Use **Newsreader** (Serif) for all major page headings.
- Use `spacing.10` (2.5rem) or `spacing.12` (3rem) for margins between major sections.
- Use `secondary` color tokens for metadata (dates, word counts, advisor names).
- Use `on_surface` (#191c1d) for all body text.

### Don't
- Don't use pure black (`#000000`) for text.
- Don't use standard blue (`#0000FF`) — use `primary` (#00346d) only.
- Don't use shadows on cards — use background shift to `surface_container_lowest`.
- Don't use 1px solid borders — use background contrast instead.
- Don't use bright status colors — use the muted token-based badge system.
