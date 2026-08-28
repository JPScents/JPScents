<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JPScents project agent rules

- Read `documentation/system/project-workflow.md` before planning substantial work or delegating agents.
- Read `documentation/system/engineering-architecture.md` before changing source structure, module ownership, or shared areas.
- Read `documentation/system/domain-data-contracts.md` before changing persisted domains, schemas, migrations, storage, authentication, or external data contracts.
- Read `documentation/system/design-foundations.md` before implementing or changing shared UI foundations or translating approved designs.
- Apply `.agents/skills/feature-structure/SKILL.md` when implementing or refactoring a feature or page. Enforce only its stated rules; preserve everything outside its scope.
- Apply `.agents/skills/shared-structure/SKILL.md` before creating, promoting, or reorganising shared code.
- Apply `.agents/skills/database-seeding/SKILL.md` before creating, extending, or reorganising database seeds.
- Apply `.agents/skills/design-to-development/SKILL.md` when translating approved product or visual sources into UI.
- Apply `.agents/skills/work-orchestration/SKILL.md` when work is delegated or coordinated across agents.
- Apply `.agents/skills/coherent-commits/SKILL.md` for repository-changing work when commits are authorized by this repository or the user.

## Persistent rules

- Inspect existing code, tests, documentation, and patterns before adding files or abstractions.
- Keep domain code feature-owned. Promote code only after real cross-feature reuse is demonstrated.
- Keep routes/pages focused on framework concerns and composition; a page is not automatically a domain feature.
- Treat the configured database schema and generated types as authoritative for persisted entities. Add application types only for real input, projection, serialization, or UI-state boundaries.
- Keep tests outside production source in the root `tests/` tree, mirroring the tested source path. Add tests for meaningful behaviour and regressions, not coverage targets.
- Use approved final designs for visual intent and the latest product specification for behaviour. Do not silently invent material missing decisions.
- Prefer small coherent changes, existing patterns, and deletion over parallel abstractions or speculative architecture.
- Run checks relevant to the change and report anything that could not be verified.
- Never stage unrelated work. Never commit, push, merge, rebase, deploy, or mutate external systems unless explicitly authorized.
- Keep secrets out of source, logs, tests, output, and commits. Inspect example environment files and documented variable names, never secret environment files.
- Do not invoke milestone or release workflows unless the configured trigger in `documentation/system/project-workflow.md` is explicitly requested.
