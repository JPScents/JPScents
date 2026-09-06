<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JPScents project agent rules

## Start here

- Read [README.md](README.md) for the current product, paths, commands, and deployment constraints. Read [prisma/README.md](prisma/README.md) for database or seed work.
- Apply [feature-structure](.agents/skills/feature-structure/SKILL.md) when implementing/refactoring a feature, page, or shared code.
- Apply [delivery-workflow](.agents/skills/delivery-workflow/SKILL.md) to repository-changing work: inspect, implement, verify, review, and commit.
- Apply [design-to-development](.agents/skills/design-to-development/SKILL.md) when implementing approved visual references or changing UI design. Structural refactors preserve existing UI.
- A request such as “Refactor the catalog feature” means execute the scoped refactor under these standards, not return another proposal. “Catalog” refers to the existing `src/features/catalogue`; inspect before resolving other informal names. Do not rename domains or refactor neighboring features merely for consistency.

## Non-negotiable boundaries

- Implement only current requirements. Keep compliant code; every new layer needs a concrete responsibility or actual reuse.
- Keep page-only presentation local, domain behavior feature-owned, and generic shared code independent. Features may depend one-way on intentional public feature APIs; never on another feature's internals.
- Application database access uses `@/db/prisma`. Never construct a client/pool in a feature or request, disconnect the shared client per request, or use it inside a transaction whose client was supplied.
- Preserve authorization, minimal client projections, atomic order/stock/customer updates, duplicate-submission protection, and single stock restoration on cancellation. Refactoring is not permission to alter product rules or database history.
- Never read, search, copy, or expose secret files or values. Use documented names/non-secret examples and account for commands that auto-load environment files. Follow README's isolated agent verification path.
- Preserve unrelated work. Do not reset, clean, overwrite, or stage another agent's/user's changes.

## Completion

- Follow the delivery skill's change-specific verification. Code refactors require targeted checks and `npm run check` or README's documented isolated equivalent; documentation-only changes require formatting, reference review, and applicable skill validation.
- Keep meaningful behavior tests in the root `tests/` tree, mirroring source ownership. No tests or abstractions merely to increase coverage or satisfy a template.
- Commit completed, verified work locally by default unless the user explicitly asks otherwise. Review the staged task-owned diff and report the commit and any verification limitations.
- Do not push, merge, rebase, deploy, run destructive database operations, or mutate external systems without authorization. Invoke milestone/release workflows only when explicitly requested.
