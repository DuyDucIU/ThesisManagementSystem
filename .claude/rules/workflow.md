**IMPORTANT:** This workflow governs all feature work and bug fixes. Superpowers skills (brainstorming, writing-plans, executing-plans, etc.) are tools invoked within this workflow — the workflow is the conductor, the skills are the instruments.

## Feature Development Process

Every new feature follows three staged cycles. **Do not write any code before the spec is approved.**

---

### Stage 1 — Brainstorm (brainstorming skill)

Invoke the `brainstorming` skill. Cover all of the following during the session:

1. **UI Design** — Design the UI first: what data is displayed, what actions the user takes, what inputs are needed. This drives everything downstream.
2. **API Contract** — Define endpoints, request/response shapes, and status codes. Get explicit user agreement before proceeding.
3. **Schema Changes** — Identify any new or modified DB tables/columns needed.
4. **Approaches** — Propose 2-3 implementation approaches with trade-offs. Get user agreement on direction.
5. **Edge cases & constraints** — Business rules, error scenarios, access control.

Output: a spec doc written to `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`, committed to git, and approved by the user.

After spec approval, ask: *"Ready to write the backend plan?"* Do not invoke writing-plans automatically.

---

### Stage 2 — Backend Cycle (writing-plans → executing-plans)

1. **Write backend plan** — invoke `writing-plans` skill scoped to backend only (NestJS module, service, controller, DTOs, unit tests).
2. **Implement** — execute the plan via `executing-plans` or `subagent-driven-development`.
3. **API Verification** — test all endpoints thoroughly: happy paths, edge cases, validation errors, auth scenarios. User verifies independently with Postman.
4. **Backend locked** — do not start frontend until backend verification passes.

After backend is verified, ask: *"Backend is verified. Ready to write the frontend plan?"* Do not proceed automatically.

---

### Stage 3 — Frontend Cycle (writing-plans → executing-plans)

1. **Write frontend plan** — invoke `writing-plans` skill scoped to frontend only (components, store, API client, routing). Written with full knowledge of real API behavior from Stage 2.
2. **Implement** — execute the plan.
3. **E2E Verification** — test with Playwright (Claude) and manual browser testing (user). Confirm the full user journey works end-to-end.

After E2E verification passes, update docs and open PR.

---

### Collapsing Stages

For simple features, backend and frontend cycles may be collapsed into a single plan and implementation pass. Use judgment — if the API is trivial and well-understood, one plan is fine. If the feature is complex or the API shape is uncertain, keep them separate.

---

### After All Stages Complete

- Update relevant `.claude/docs/` files with any new patterns, gotchas, or conventions discovered.
- Update `CLAUDE.md` if the tech stack, repo layout, commands, or caveats changed.
- Commit docs updates, then open PR.

---

## Git Rules

- **Branch naming**: `<type>/<short-description>` — e.g., `feature/thesis-crud`, `fix/auth-redirect`, `chore/add-prisma`
- **Commit messages**: imperative mood, concise — e.g., "Add thesis submission endpoint"
- **Commit after each approved task** — when using `subagent-driven-development`, the implementer subagent commits after each task passes both spec compliance and code quality review. In all other workflows, only commit when the user explicitly asks.
- **Never force-push** without explicit user approval

## Documentation Maintenance

- Before merging any branch, update relevant `.claude/docs/` files if new patterns, gotchas, or conventions were discovered during the feature work.
- Update `CLAUDE.md` whenever something changes that it tracks — new libraries added to the tech stack, new directories in the repo layout, new commands, or new caveats.
- Keep documentation accurate and current.
