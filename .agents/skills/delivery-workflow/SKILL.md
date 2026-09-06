---
name: delivery-workflow
description: Complete authorized repository changes from inspection through proportionate verification, diff review, and coherent local commits; coordinate delegated work only when needed.
---

# Delivery Workflow

Use the project's instructions for commands, paths, and authorization. An implementation or refactor request authorizes execution within its scope; do not stop at a proposal or reopen an approved architecture decision. Review-only requests remain read-only.

## Inspect and decide

- Inspect Git status and applicable instructions before edits. Preserve unrelated user/agent changes; never reset, clean, or overwrite them to simplify the task.
- Resolve the requested feature from existing names, routes, and consumers. Do not rename a domain for a spelling variation or invent a new feature because the user's label differs.
- Trace the target's routes, components, state/providers, actions, data operations, projections, tests, and relevant infrastructure. Inspect dependencies only as far as needed to understand behavior and ownership.
- A whole-feature refactor requires a whole-feature responsibility review. Account for every module: actual responsibility, callers, necessity, and required location under feature-structure. Keep a compact working assessment; do not create a permanent architecture report unless requested. Do not select a few easy improvements and silently narrow the assignment.
- Briefly state preserved behavior and the simplification to make. Evaluate deletion/merging before extraction. Remove pass-through layers, duplicate rules, stale exports, misplaced code, and dead files. Existing abstractions must earn retention; old names and archived structural choices are not exemptions from current standards.
- Make routine implementation choices and continue. Ask only when an unresolved product decision, destructive action, or material ambiguity changes the outcome. Flag discovered bugs; fix small directly related issues with clear intended behavior, but do not bundle speculative behavior, schema, or unrelated feature changes.
- Preserve UI, responsiveness, motion, accessibility, authorization, persisted contracts, and current business invariants unless the task changes them. Internal paths/exports may change with their consumers.

## Verify the actual boundary

| Change                                                    | Required evidence                                                                                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation / skills and bundled checks                 | Format changed files, validate skills, check references and contradictory guidance. Exercise changed checks with compliant and violating inputs; review realistic mixed-responsibility examples against the instructions. |
| Code / feature refactor                                   | Targeted behavior checks, formatting, lint, types, and the project's full check or documented safe equivalent.                                                                                                            |
| UI / state                                                | Exercise affected behavior, including relevant pending/error paths and keyboard/focus interactions. Check desktop/mobile when layout or responsiveness changes.                                                           |
| Server/client imports, routes, or framework configuration | Build and exercise affected routes in a permitted environment; unit tests with mocked server boundaries cannot prove the framework module graph.                                                                          |
| Transactions, migrations, or database constraints         | Relevant tests plus actual database verification against a deliberately selected disposable target when authorized. Mocks do not prove rollback, concurrency, or trigger behavior.                                        |

- Read scripts/configuration before unfamiliar commands. Never inspect secret files or dump environment values; account for tools that load environment files automatically. Use documented isolated configuration where available.
- Format task-owned files; avoid repository-wide write commands when unrelated work exists. Passing Prettier does not establish readable naming, nesting, or responsibility boundaries.
- Keep tests for business rules, state transitions, integration boundaries, meaningful failure recovery, and accessibility behavior. Do not add coverage quotas, static-copy/style/count assertions, trivial forwarding tests, source-text tests, or tests that merely mirror the implementation.
- Test through observable behavior at a useful boundary; do not test every child separately. Update assertions that overstate what they prove. Reuse existing tools instead of adding infrastructure without need.
- Once relevant checks pass, repeat only after changes or new evidence justify it. If a required environment is unavailable, finish independent work and report the exact unverified behavior; do not silently weaken the check or claim it passed.

## Structure and readability are completion requirements

- Run the feature skill's structure check against the whole refactored feature. It must pass before claiming a full refactor complete. Then inspect actual contents: a correctly named repository with business orchestration or a mapper with network requests still fails the standard. No renaming-only fixes, catch-all folders, suppressions, or new exceptions to manufacture a pass.
- Review routes and consumers for ownership, unnecessary wrappers, duplicate types, stale entry points, and accidental cross-feature dependencies. State why significant retained abstractions are needed. If an in-scope violation remains unresolved, report the refactor as incomplete, even if tests pass. Focused fixes and standards-only work report unrelated existing violations without migrating other features.
- Apply the repository's Prettier configuration to task-owned files, then run formatting and lint checks. Confirm the files are covered by those tools; ignored or unsupported files still need deliberate formatting review. Check commands report problems; they do not apply formatting. Use README's safe commands under the no-secret-file rule.
- Read the final formatted code. Separate imports, declarations, and meaningful steps with sensible whitespace; use one statement per line. Prefer explicit names, early returns, and short cohesive blocks over compressed logic, chained nested ternaries, or deeply nested callbacks. Keep simple expressions simple. Do not extract a function or file solely to satisfy a line count or replace readable code with narration comments.
- Formatting success is necessary for covered files but does not prove readable organization, semantic names, or appropriate boundaries. Correct those issues before completion; do not respond to them only by rerunning Prettier.

## Review and commit

- Review the final diff for accidental changes, lost behavior, unnecessary layers, duplicated rules, unsafe data exposure, weakened tests, and unreadable code. Search for stale imports/exports/paths before deleting replacements.
- Update documentation and instructions made stale by this task, without adding a generic architecture report or unrelated rules.
- Inspect the entire index before staging and immediately before committing, not just a path-filtered diff. Stage exact task-owned files/hunks. Already-staged unrelated changes would enter an ordinary commit even after staging only your paths. Preserve them: serialize commit activity or use an isolated index/commit mechanism without altering their staged content. Never reset shared history to repair a mixed commit.
- Commit completed, verified work when authorized; never commit known failures or unresolved correctness concerns introduced by the change. Report pre-existing issues separately rather than expanding scope to make the entire repository perfect. For a full feature refactor, existing in-scope structural violations remain part of the assignment.
- Use one coherent commit for a short task and independently understandable commits at completed boundaries for longer work. Follow existing commit conventions.
- If a required check could not run, state that limitation and assess whether the change can be responsibly committed; an unavailable environment is not a passing check.
- Do not push, merge, rebase, tag, deploy, or mutate external systems without authorization. Do not invoke milestone/release workflows for ordinary work.
- Report the outcome, actual simplification (deleted/merged layers, consolidated rules, corrected responsibilities), meaningful checks and limitations, commit IDs, and intentional uncommitted work. Distinguish moved files from reduced complexity. Do not call a partial feature improvement a completed feature refactor. Confirm no task-owned accidental leftovers remain.

## Seeds and delegated work, only when applicable

- Seed work follows the actual entry point and schema, not a mandatory seed framework. Keep deterministic identifiers/order, repeatable execution, and cleanup limited to seed-owned records/assets. Never reset/reseed shared data or run destructive database operations without explicit authorization.
- Delegate only when permitted and independently useful. Inspect active work; give each agent an explicit outcome, file ownership, non-goals, relevant sources, verification, and commit/side-effect permissions.
- Keep overlapping edits sequential. Preserve others' work, re-inspect prerequisite changes, and verify handoffs before integrating. Respect requests to use an existing task/checkout; do not create agents, tasks, or worktrees automatically.
