<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JPScents project agent rules

- Read `README.md` for the current product boundary, project structure, environment, database, authentication and deployment requirements.
- Apply `.agents/skills/feature-structure/SKILL.md` when implementing or refactoring a feature or page. Enforce only its stated rules; preserve everything outside its scope.
- Apply `.agents/skills/shared-structure/SKILL.md` before creating, promoting, or reorganising shared code.
- Apply `.agents/skills/database-seeding/SKILL.md` before creating, extending, or reorganising database seeds.
- Apply `.agents/skills/design-to-development/SKILL.md` when translating approved product or visual sources into UI.
- Apply `.agents/skills/work-orchestration/SKILL.md` when work is delegated or coordinated across agents.
- Apply `.agents/skills/coherent-commits/SKILL.md` when completing repository-changing work; local commits are authorized by default.

## Persistent rules

- Inspect existing code, tests, documentation, and patterns before adding files or abstractions.
- Keep domain code feature-owned. Promote code only after real cross-feature reuse is demonstrated.
- Keep routes/pages focused on framework concerns and composition; a page is not automatically a domain feature.
- Keep route-only UI and interactions in local `_components/` and `_hooks/`. Follow the feature-structure skill for component/hook boundaries and type placement; extract only when it clarifies responsibility.
- Treat the configured database schema and generated types as authoritative for persisted entities. Add application types only for real input, projection, serialization, or UI-state boundaries.
- Keep tests outside production source in the root `tests/` tree, mirroring the tested source path. Test business rules, meaningful state transitions, integrations, failure recovery, and keyboard/focus behaviour that could realistically regress. Avoid tests for static copy, element counts, styling, trivial prop/callback forwarding, or third-party behaviour already covered elsewhere. Do not add tests or test infrastructure merely to raise coverage.
- Use approved final designs for visual intent and the latest product specification for behaviour. Do not silently invent material missing decisions.
- Prefer small coherent changes, existing patterns, and deletion over parallel abstractions or speculative architecture.
- Apply formatting to changed files and run relevant checks before committing; report anything that could not be verified. `npm run fix` applies ESLint fixes then Prettier across the repository; use targeted file commands when unrelated work is present. `npm run check` verifies formatting, lint, types, and tests without changing source files. Keep logical sections and complex expressions readable; formatter success alone does not prove readability.
- Commit completed, verified work in coherent local commits unless the user explicitly asks otherwise. Stage only task-owned files or hunks, review the staged diff, and report the commit. Never push, merge, rebase, deploy, or mutate external systems unless explicitly authorized.
- Keep secrets out of source, logs, tests, output, and commits. Inspect example environment files and documented variable names, never secret environment files.
- Do not invoke milestone or release workflows unless the user explicitly requests the configured workflow trigger.
