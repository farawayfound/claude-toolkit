---
name: recon
description: "Use at the start of work in an unfamiliar repository, or before planning a change in code you have not read: parallel read-only reconnaissance (commands and baseline, code path to the side effect, bypasses, test conventions) condensed into one brief."
argument-hint: "[topic]"
---

# Recon: $ARGUMENTS

Read-only: no edits, installs, commits or branch switches. Never open .env or other secret files.

Launch all four in ONE message so they run concurrently. Each brief is self-contained and asks for at most 15 lines with file:line evidence.
1. **verifier** agent, background. Baseline at HEAD: resolve the format, lint, typecheck and test commands (each `confirmed-by-CI` or `unverified`), run each once, report the table and any pre-existing failures verbatim.
2. **Explore** agent. Code path: trace "$ARGUMENTS" from its entrypoint (route, CLI command, tool handler, job) to the side effect (API call, DB write, file write) as numbered file:line steps. Name the single chokepoint where a check or fix belongs.
3. **Explore** agent. Blast radius: every other path that reaches the same side effect without passing that chokepoint (bulk, delete, raw passthrough, background jobs, scripts); where identity, config and credentials are loaded, by file and variable name only, never values.
4. **Explore** agent. Conventions: the closest existing tests to mirror (framework, fixtures, mocks, layout), `git log --oneline -15` commit style, and any README, CONTRIBUTING or AGENTS.md rule that binds a change here.

With no topic, agents 2 and 3 map the main entrypoints and their side effects instead. While they run, skim the top-level README yourself; do not wait idle. Re-check any surprising claim with one command before reporting it.

## Output: exactly these sections, at most 25 lines
```
**Stack & commands**: <languages, frameworks, package manager>
  test `<cmd>` (confirmed-by-CI|unverified); lint `<cmd>` (...); typecheck `<cmd>` (...); format `<cmd>` (...)
**Baseline**: `<cmd>` exit <n>, <counts>; pre-existing failures: <verbatim | none | not verified: reason>
**Code path**: 1. <file:line> <what happens> ... N. <file:line> <side effect>
**Chokepoint & bypasses**: chokepoint <file:line>; bypasses: <file:line list | none found>
**Risks & unknowns**: <identity source, shared credentials, missing tests, services needed>
**Questions (max 3)**: 1. <question> (default if unanswered: <default>)
**Smallest valuable change**: <one sentence>; next: /scope <task>
```
