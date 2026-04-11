**IMPORTANT:** Must follow superpowers workflow for all feature work and bug fixes.

## Feature Development Process

Every new feature follows this strict sequence. **Do not write any code before step 2 is agreed upon.**

1. **UI Design** — Design the UI first to identify what data is displayed, what actions the user takes, and what inputs are needed. This drives everything downstream.
2. **API Contract** — Define the endpoints, request/response shapes, and status codes. Get explicit user agreement before proceeding. No implementation begins until this is locked.
3. **Schema Changes** — If the feature requires new or modified database tables/columns, update the schema and run migrations.
4. **Backend Implementation** — Implement the API endpoints per the agreed contract. Follow NestJS module conventions.
5. **API Testing** — Thoroughly test all endpoints: happy paths, edge cases, validation errors, auth scenarios. The user will also verify independently with Postman.
6. **Frontend Implementation** — Build the UI and integrate with the tested API.
7. **End-to-End Verification** — Test with Playwright (Claude) and manual browser testing (user). Confirm APIs behave correctly through the UI — not just in isolation.

Superpowers workflow (brainstorming, planning, etc.) applies throughout all steps.

## Git Rules

- **Branch naming**: `<type>/<short-description>` — e.g., `feature/thesis-crud`, `fix/auth-redirect`, `chore/add-prisma`
- **Commit messages**: imperative mood, concise — e.g., "Add thesis submission endpoint"
- **Commit after each approved task** — when using `subagent-driven-development`, the implementer subagent commits after each task passes both spec compliance and code quality review. In all other workflows, only commit when the user explicitly asks.
- **Never force-push** without explicit user approval

## Documentation Maintenance

- Before merging any branch, update relevant `.claude/docs/` files if new patterns, gotchas, or conventions were discovered during the feature work.
- Update `CLAUDE.md` whenever something changes that it tracks — new libraries added to the tech stack, new directories in the repo layout, new commands, or new caveats.
- Keep documentation accurate and current.
