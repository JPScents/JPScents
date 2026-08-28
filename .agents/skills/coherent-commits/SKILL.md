---
name: coherent-commits
description: Create small, coherent Git commits during authorized repository work without staging unrelated changes.
---

# Coherent Commits

Use this skill only when the user or repository instructions authorize commits.

- Inspect the working tree before changing or staging files.
- Commit a short task as one coherent change.
- During longer work, commit at natural completed boundaries that can be understood and reverted independently.
- Keep implementation, its tests, and required documentation together when they form one behaviour change.
- Never combine unrelated work or stage another agent's/user's changes.
- Stage exact files or hunks, run relevant checks, and review the staged diff before every commit.
- Follow the repository convention; otherwise use a concise Conventional Commit message.
- Do not create knowingly broken, empty, or speculative commits.
- If overlapping changes cannot be isolated safely, leave them uncommitted and report the conflict.
- Do not push, merge, rebase, tag, deploy, or rewrite history unless explicitly requested.

Report the commits created and any intentional uncommitted work.
