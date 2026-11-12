<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JPScents project agent rules

## Canonical guidance

- [Architecture](docs/architecture/ARCHITECTURE.md) and [Coding standards](docs/engineering/CODING_STANDARDS.md) define the approved rules. [Accepted ADRs](docs/architecture/adr/README.md) record their rationale and decision history. Check status before relying on a decision.
- [Compliance baseline](docs/engineering/COMPLIANCE_BASELINE.md) records existing debt, pending implementation, and missing evidence. [Exceptions](docs/engineering/EXCEPTIONS.md) records explicit approvals with exact scope. A pending change, legacy violation, or existing suppression carries no approval by itself. [Controls audit](docs/engineering/CONTROLS_AUDIT.md) describes what the tools currently enforce.
- Use the approved contracts for engineering decisions, the skills for execution, and the [README](README.md) for product and commands. Current approved decisions take precedence over archived milestones and historical implementation. For database or seed work, also read [Prisma guidance](prisma/README.md).

## Workflow routing

- Apply [feature-structure](.agents/skills/feature-structure/SKILL.md) when implementing or refactoring a feature, page, or shared code. Apply [delivery-workflow](.agents/skills/delivery-workflow/SKILL.md) to repository changes for inspection, verification, and review. Read the canonical guidance above before applying either skill.
- Apply [design-to-development](.agents/skills/design-to-development/SKILL.md) when implementing approved visual references or changing UI design. Preserve existing UI during structural refactors.
- Use the global `milestone-authoring` skill for an explicit milestone creation or revision request. Use `milestone-workflow` for **Run Active Milestone** or **Resume Active Milestone**. Preserve the existing branch, PR history and review count on resume. The workflow requires independent review and only the human merges.
- During authoring, run and resume, apply the repository's [milestone completion checkpoints](docs/engineering/MILESTONE_INTEGRATION.md) through the existing skills. Require snapshot-matched verification evidence and a separate `independent-review` PASS for READY. The checkpoint applies to JPScents, including resumed contracts, without altering approved scope.
- **Sync After Merge** uses the milestone skill's synchronization path only. Verify the merged PR, then safely fast-forward or switch to its base while preserving local changes. Keep the active contract at the locally ignored `.agents/milestones/active.md`. Ordinary changes use the delivery workflow. Milestone and release workflows require an explicit request.
- “Catalog” means `src/features/catalogue`. A full feature refactor covers every module and affected consumer. A whole-codebase refactor also covers routes, shared code, infrastructure, scripts, tests and tooling. Keep the scope of focused changes and retain compliant code.

## Before changing code

Agents MUST complete both steps before editing code.

1. Inspect Git status, applicable instructions, and the approved contracts, related ADRs, baseline findings and scoped exceptions for the change.
2. Trace the normal entry points and consumers. Identify effects on dependencies, data flow, authorization, transactions, client projections and tests. Reuse the existing owner and plan verification at each affected boundary.

## Implementation and approval

- Follow approved ownership, dependencies and product invariants. Keep new layers proportional to current requirements. Preserve the architecture's authorization, data projection, atomicity, idempotency and cancellation guarantees. Keep existing violations visible by finding ID and avoid expanding them.
- Agents MUST NOT silently introduce a new architecture, exception, suppression or rule override. If a request conflicts with an approved rule, identify the rule and proposed change. Obtain explicit approval for a [new ADR](docs/architecture/adr/README.md#naming-and-lifecycle) or [scoped exception](docs/engineering/EXCEPTIONS.md#recording-review-and-supersession) before proceeding with the conflicting part. Approval applies to the documented scope.
- Use [engineering change control](docs/engineering/CHANGE_CONTROL.md) to propose, record and verify changes to approved architecture, standards or mandatory checks.
- Never inspect, copy or expose secret files or values. Use documented variable names and non-secret examples. Account for commands that load environment files automatically.
- Preserve unrelated index and working-tree changes. Commit, push, merge, rebase, deploy, run destructive database operations, or mutate external systems only with applicable user authorization. Inspect the entire index before any authorized commit and keep the commit limited to the task.

## Verification and completion

- Run `npm test -- <test-path>` for affected behavior and `npm run check` or the documented isolated equivalent for code refactors and architecture-affecting changes. The full check includes `npm run architecture:check`, formatting, lint, type checking and Vitest. For a full refactor, review every affected module's actual responsibility and explain any retained layers or unresolved violations.
- Follow VER-02 and the [isolated verification instructions](README.md#agent-verification-without-secret-file-access). Use an isolated production build for runtime boundary changes, a disposable migrated database for changed persistence invariants, and real browser or provider evidence for affected flows. Prisma and Next commands can auto-load configured environment files. For documentation-only changes, run `npm run format:check`, validate references and review any changed skills.
- Review the diff for scope and readability. Report the checked revision for architecture changes, commands run, results, failures and unverified boundaries. Passing a structural check or mock test establishes only what that check exercised.
- These instructions route work and require evidence. Local scripts enforce their configured checks when run. Semantic review and integration evidence still require execution. The required merge gate is approved under VER-03, and hosted enforcement remains unverified in the [controls audit](docs/engineering/CONTROLS_AUDIT.md#executed-verification).
