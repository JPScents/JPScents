# Project Workflow

## Sources of truth

1. Freeman's latest approved correction in the active task.
2. Notion `06 — Website Structure — Internal` for behaviour and scope.
3. Paper `Final Site` for public presentation.
4. Paper `Final Admin` for Admin presentation.
5. Paper `Workspace / Exploration` for foundations and component variants.
6. Approved documents in this directory.
7. Current implementation.

Later approved corrections override older material. Product sources govern behaviour; final Paper references govern presentation.

## Delivery stages

1. **Extract** — inspect every definitive page, state, and component family.
2. **Approve** — Freeman approves the consolidated routes, models, ownership, operations, and decisions.
3. **Milestone plan** — after approval, use the milestone-authoring workflow to define the minimum dependency-led contract(s).
4. **Implement** — the explicit trigger `Run Active Milestone` executes the current active contract; make only its coherent changes.
5. **Verify** — run targeted checks and visually compare responsive UI with Paper.
6. **Review and record** — inspect the diff, update current-truth documentation, and commit only when authorized.

## Delegation rule

Use the minimum number of agents and worktrees justified by actual dependency separation. Shared foundations, schema, configuration, route layouts, and package manifests are high-conflict areas and must be sequenced. Disjoint feature/page work may run asynchronously only after its contracts and dependencies exist.

## Documentation rule

`documentation` is the single source of truth. It records current decisions, not chat history. Replace stale claims; do not maintain parallel architecture documents.

## Verification baseline

```text
lint:       npm run lint
typecheck:  npm run typecheck
tests:      not configured yet
build:      npm run build
```

Current ordinary branch: `master`.
