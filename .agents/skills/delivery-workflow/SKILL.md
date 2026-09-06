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
- For a nontrivial refactor, briefly state what must remain and which boundaries need correction. Use repository evidence to remove pass-through layers, duplication, stale exports, misplaced code, and dead files; leave compliant code alone.
- Make routine implementation choices and continue. Ask only when an unresolved product decision, destructive action, or material ambiguity changes the outcome. Flag discovered bugs; fix small directly related issues with clear intended behavior, but do not bundle speculative behavior, schema, or unrelated feature changes.
- Preserve UI, responsiveness, motion, accessibility, authorization, persisted contracts, and current business invariants unless the task changes them. Internal paths/exports may change with their consumers.

## Verify the actual boundary

| Change                                                    | Required evidence                                                                                                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation / skills only                               | Format changed Markdown, validate changed skills if a validator is available, check referenced paths and stale guidance. Substantial instruction changes merit a read-only trial of a realistic request. |
| Code / feature refactor                                   | Targeted behavior checks, formatting, lint, types, and the project's full check or documented safe equivalent.                                                                                           |
| UI / state                                                | Exercise affected behavior, including relevant pending/error paths and keyboard/focus interactions. Check desktop/mobile when layout or responsiveness changes.                                          |
| Server/client imports, routes, or framework configuration | Build and exercise affected routes in a permitted environment; unit tests with mocked server boundaries cannot prove the framework module graph.                                                         |
| Transactions, migrations, or database constraints         | Relevant tests plus actual database verification against a deliberately selected disposable target when authorized. Mocks do not prove rollback, concurrency, or trigger behavior.                       |

- Read scripts/configuration before unfamiliar commands. Never inspect secret files or dump environment values; account for tools that load environment files automatically. Use documented isolated configuration where available.
- Format task-owned files; avoid repository-wide write commands when unrelated work exists. Passing Prettier does not establish readable naming, nesting, or responsibility boundaries.
- Keep tests for business rules, state transitions, integration boundaries, meaningful failure recovery, and accessibility behavior. Do not add coverage quotas, static-copy/style/count assertions, trivial forwarding tests, source-text tests, or tests that merely mirror the implementation.
- Test through observable behavior at a useful boundary; do not test every child separately. Update assertions that overstate what they prove. Reuse existing tools instead of adding infrastructure without need.
- Once relevant checks pass, repeat only after changes or new evidence justify it. If a required environment is unavailable, finish independent work and report the exact unverified behavior; do not silently weaken the check or claim it passed.

## Review and commit

- Review the final diff for accidental changes, lost behavior, unnecessary layers, duplicated rules, unsafe data exposure, weakened tests, and unreadable code. Search for stale imports/exports/paths before deleting replacements.
- Update documentation and instructions made stale by this task, without adding a generic architecture report or unrelated rules.
- Stage exact task-owned files/hunks and inspect the staged diff. Commit completed, verified work when the user/project authorizes it; never commit known failures or unresolved correctness concerns introduced by the change. Report pre-existing issues separately rather than expanding scope to make the entire repository perfect.
- Use one coherent commit for a short task and independently understandable commits at completed boundaries for longer work. Follow existing commit conventions.
- If a required check could not run, state that limitation and assess whether the change can be responsibly committed; an unavailable environment is not a passing check.
- Do not push, merge, rebase, tag, deploy, or mutate external systems without authorization. Do not invoke milestone/release workflows for ordinary work.
- Report the outcome, meaningful checks and limitations, commit IDs, and any intentional uncommitted work. Confirm the final tree contains no accidental leftovers.

## Seeds and delegated work, only when applicable

- Seed work follows the actual entry point and schema, not a mandatory seed framework. Keep deterministic identifiers/order, repeatable execution, and cleanup limited to seed-owned records/assets. Never reset/reseed shared data or run destructive database operations without explicit authorization.
- Delegate only when permitted and independently useful. Inspect active work; give each agent an explicit outcome, file ownership, non-goals, relevant sources, verification, and commit/side-effect permissions.
- Keep overlapping edits sequential. Preserve others' work, re-inspect prerequisite changes, and verify handoffs before integrating. Respect requests to use an existing task/checkout; do not create agents, tasks, or worktrees automatically.
