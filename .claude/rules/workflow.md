**IMPORTANT:** This workflow governs all feature work and bug fixes. Superpowers skills are tools invoked within this workflow.

## Feature Development Process

Every new feature follows three stages. **Do not write any code before the spec is approved.**
**Hard rule: the frontend implementation cycle never begins until the user has verified the backend independently.** Writing the frontend plan upfront (alongside the backend plan) is allowed — planning is design, not implementation.

---

### Stage 1 — Brainstorm

Design the feature before any code is written. Cover all of the following during the session:

1. **UI Design** — Design the UI first: what data is displayed, what actions the user takes, what inputs are needed. This drives everything downstream.
2. **API Contract** — Define endpoints, request/response shapes, and status codes. Get explicit user agreement before proceeding.
3. **Schema Changes** — Identify any new or modified DB tables/columns needed.
4. **Approaches** — Propose 2-3 implementation approaches with trade-offs. Get user agreement on direction.
5. **Edge cases & constraints** — Business rules, error scenarios, access control.

After spec is approved, the user may request both plans upfront (backend and frontend together) or one at a time. Either way, each implementation cycle still runs sequentially — backend cycle must complete and be verified before the frontend implementation cycle starts.

---

### Stage 2 — Backend Cycle

1. **Implement** — execute the backend plan.
2. **API Verification** — test all endpoints thoroughly: happy paths, edge cases, validation errors, auth scenarios. User verifies independently with Postman.

---

### Stage 3 — Frontend Cycle

1. **API Drift Check** — before executing, review the frontend plan against actual API behavior from Stage 2 and update any tasks that drifted.
2. **Implement** — execute the frontend plan. When building new pages or components, invoke `/frontend-design` skill for distinctive, production-grade UI quality.
3. **E2E Verification** — test with Playwright (Claude) and manual browser testing (user). Confirm the full user journey works end-to-end.

After E2E verification passes, wrap up the branch.

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
