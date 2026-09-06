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
- A request such as “Refactor the catalog feature” means review the entire feature, remove unjustified architecture, correct semantic responsibilities and locations, verify, and commit. A narrow improvement pass does not complete that request. “Catalog” refers to `src/features/catalogue`; inspect before resolving other informal names. Do not rename domains or refactor neighboring features merely for consistency.

## Non-negotiable boundaries

- Implement only current requirements. Existing and new layers must justify their responsibility; merge or delete those that add no value. Do not preserve an abstraction merely because it exists.
- Feature roots allow only explicit public entry points (`index.ts`, `server.ts`, `client.ts`) and optional maintained `README.md` / `AGENTS.md`. Implementations belong in the feature skill's defined responsibility folders. Folders are optional; their semantics and names are mandatory. No root query/mutation/projection modules or catch-all utilities.
- Database operations belong in repositories, business workflows/transactions in services, and pure transformations in mappers. Classify mixed files by their actual contents before splitting or merging; moving a mixed file intact is not compliance. Ordinary validation functions are parsers/validators, not schemas; do not add a schema library to preserve a misleading name.
- Keep page-only presentation local, domain behavior feature-owned, and generic shared code independent. Features may depend one-way on intentional public feature APIs; never on another feature's internals.
- Application database access uses `@/db/prisma`. Never construct a client/pool in a feature or request, disconnect the shared client per request, or use it inside a transaction whose client was supplied.
- Preserve authorization, minimal client projections, atomic order/stock/customer updates, duplicate-submission protection, and single stock restoration on cancellation. Refactoring is not permission to alter product rules or database history.
- Never read, search, copy, or expose secret files or values. Use documented names/non-secret examples and account for commands that auto-load environment files. Follow README's isolated agent verification path.
- Preserve unrelated work. Do not reset, clean, overwrite, or stage another agent's/user's changes.

## Completion

- Follow the delivery skill's change-specific verification. Code refactors require targeted checks and `npm run check` or README's documented isolated equivalent; documentation-only changes require formatting, reference review, and applicable skill validation.
- Full feature refactors must pass `node .agents/skills/feature-structure/scripts/check-structure.mjs src/features/<feature>` and a semantic review of every module. Explain what complexity was removed, why significant retained layers are needed, and any unresolved violations. A passing file check or test suite alone does not establish completion.
- Format changed files and inspect readability after formatting: clear names, separated logical steps, readable branching, and no compressed statements or deeply nested expressions hidden behind a passing formatter.
- Keep meaningful behavior tests in the root `tests/` tree, mirroring source ownership. No tests or abstractions merely to increase coverage or satisfy a template.
- Commit completed, verified work locally by default unless the user explicitly asks otherwise. Inspect the entire staged diff; staging exact paths does not exclude already-staged unrelated work. Preserve others' index/worktree changes, isolate the commit, and never reset shared history to repair a mixed commit. Report the commit and verification limitations.
- Do not push, merge, rebase, deploy, run destructive database operations, or mutate external systems without authorization. Invoke milestone/release workflows only when explicitly requested.
