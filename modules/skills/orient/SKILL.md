---
name: orient
description: "Use at the start of work in an unfamiliar repository, or before planning a change in code you have not read: confirms stack and commands, runs the baseline checks, traces the code path for a topic to its side effect, and lists the chokepoint, bypass paths, risks and questions. Read-only."
argument-hint: "[topic]"
---

# Orient: $ARGUMENTS

Read-only reconnaissance of this checkout before any plan or edit. Topic (may be empty): $ARGUMENTS

## Rules
- Make no edits, installs, commits, branch switches or other state changes.
- Never open .env or other secret files; .env.example gives key names.
- Send wide searches (whole-tree scans, more than about three greps) to the Explore subagent and keep only its summary.
- Run each command yourself and keep its real output; do not guess results.

## Steps
1. **Facts.** Read CLAUDE.local.md, README, CONTRIBUTING, AGENTS.md and the CI workflows (`.github/workflows/*.yml`, or the repo's CI config). If CLAUDE.local.md has no command table, run `node ~/.claude/hooks/detect.mjs` (repo-level installs: `node .claude/hooks/tk/detect.mjs`) when that file exists; otherwise read the Makefile, package scripts and CI yourself. Mark each format, lint, typecheck and test command `confirmed-by-CI` when a workflow runs it, else `unverified`.
2. **History.** Run `git log --oneline -15` and `git status`. Note the commit-message convention, recently churned files and whether the tree is clean.
3. **Baseline.** Run the test command and the lint command once each. Record counts and copy pre-existing failures verbatim; do not fix them. If a check needs a missing tool or service, write `not verified: <missing piece>`.
4. **Code path** (only when a topic is given). Trace $ARGUMENTS from its entrypoint (route, CLI command, tool handler, job) to the side effect (API call, DB write, file write) as numbered `file:line` steps. Name the single chokepoint where a check or fix belongs. List bypass paths that reach the same side effect without passing it: bulk operations, delete paths, raw passthrough, background jobs, scripts.
5. **Trust boundaries.** Note where identity, config and credentials are loaded and used, by file and variable name only. Never print a value.

## Output
Exactly these sections, at most 25 lines in total:

```
**Stack & commands**: <languages, frameworks, package manager>
  test `<cmd>` (confirmed-by-CI|unverified); lint `<cmd>` (...); typecheck `<cmd>` (...); format `<cmd>` (...)
**Baseline**: `<cmd>` exit <n>, <counts>; pre-existing failures: <verbatim | none | not verified: reason>
**Code path**: 1. <file:line> <what happens> ... N. <file:line> <side effect>
**Chokepoint & bypasses**: chokepoint <file:line>; bypasses: <file:line list | none found>
**Risks & unknowns**: <identity source, shared credentials, missing tests, flaky areas, data migrations>
**Questions (max 3)**: 1. <question> (default if unanswered: <default>)
**Smallest valuable change**: <one sentence>; next: /scope <task> (or a plan in the conversation if /scope is not installed)
```

Omit nothing: write `n/a` for Code path and Chokepoint when no topic was given.
