---
name: work-orchestration
description: Plan and coordinate delegated repository work across agents using explicit ownership, dependency-aware sequencing, verification, and coherent handoffs.
---

# Work Orchestration

Use when the user asks to delegate, coordinate specialized agents, or split substantial work.

## Roles

- **Orchestrator:** reconciles sources, defines the task graph, assigns ownership, sequences conflicts, and reviews handoffs. It does not duplicate delegated implementation.
- **Implementation agent:** owns one bounded outcome, inspects the live repository, preserves concurrent work, verifies the result, and commits only its scope.
- **Design agent:** inspects approved design sources and resolves visual evidence; it changes code only when explicitly assigned implementation.
- **Reviewer:** independently checks acceptance, regressions, security, and maintainability when risk justifies a separate pass. It does not rewrite compliant work for preference.

Roles describe responsibility, not permanent agents. Reuse existing agents when appropriate and create a specialized role only when it improves ownership or independence.

## Decide the split

- Inspect the repository, current status, relevant documents, and active agent work before delegating.
- Split by independent ownership and independently verifiable outcomes, not arbitrary file counts.
- Keep a small cohesive task with one agent. Do not create multi-agent overhead without real parallel value.
- Identify dependencies and high-conflict files before dispatch.

## Assignment

Every delegation states:

- the outcome and explicit non-goals;
- owned feature/files and high-conflict areas to avoid;
- sources and repository skills to read;
- dependencies and whether work may begin immediately;
- behaviour/contracts that must remain unchanged;
- required verification;
- branch/checkout convention;
- commit and push authorization;
- that other agents or user changes may exist.

Use an existing external agent/task when the user names or has prepared one. Do not create a new task, subagent, branch, or worktree when the user has prohibited it or requested an existing external agent.

## Concurrency

- Parallelize only disjoint ownership.
- Give one agent ownership of a file or shared concern at a time.
- Sequence work that touches the same repository, mapper, service, public boundary, route, package manifest, schema, or shared module.
- In a shared checkout, every agent preserves live changes, avoids reset/clean/revert, stages only its own work, and commits before a dependent agent begins.
- Worktrees belong only to a configured workflow; do not introduce them automatically.

## Coordination and handoff

- Steer an active agent when scope changes; do not silently start a competing implementation.
- Wait for prerequisite commits, then require dependent agents to re-inspect the live tree.
- Require concise reports containing decisions, changed files, checks, commit hashes, and genuine blockers.
- At completion, confirm the expected commits are present, the tree has no unintended leftovers, and documentation matches the implemented boundaries.
