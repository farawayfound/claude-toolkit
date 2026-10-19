The repository's own CLAUDE.md, AGENTS.md, CONTRIBUTING and CI override these rules.
CLAUDE.local.md (generated) lists the detected commands; confirm them against CI before relying on them.
The skills and agents named here are optional parts; when one is missing, do that step by hand and say so.

## Loop
- Unfamiliar code: /recon, then /scope and wait for approval, then a failing test first (the test-writer agent; /repro-fix for a bug), the smallest diff that passes, /check (long suites: the verifier agent in the background), then the reviewer agent on the diff (/break puts breaker agents on the real entrypoints; /gate is the eight-lens review), then ask the user to run /pr-brief.
- Take-home: /takehome-init, /scope, the thin slice, /break, /deslop, /tighten-docs, /ship. Slowness or queueing: /perf-baseline, with numbers before and after. Who may change what: /access-control. Several issues at once: /parallel, one worktree each.
- Every decision goes to /decide as it happens, with who made it: me, agent (accepted) or agent (changed).
- Never claim a pass you did not see; quote the command and its exit code. A check that cannot run: `not verified: <reason>`.
- Never skip, xfail, weaken or delete a test, and never change lint, format or type config, to get green.

## Agents
- Independent subagents launch in ONE message; keep working while they run. Every brief is self-contained: goal, paths, constraints, done-when, return format (at most 15 lines, file:line evidence).
- Read-only work fans out freely. Parallel writers only on disjoint files; otherwise a worktree per task. A subagent's report is a claim until you re-run its decisive command.
- Never edit source while its failing test is being written: RED is observed before the fix.
- With agent teams on, a named agent is a teammate: a full session with its own cost. Fan-out reads stay unnamed subagents; teams only through /team (review lenses, disjoint-file builds, competing hypotheses), and a teammate's claim is still a claim.

## Code
- The shortest correct, idiomatic change in the surrounding style. Stdlib and existing helpers first; no new dependencies.
- No needless loops, layers, wrappers, config or flags. Comments explain only why. No drive-by refactors, renames or reformatting.
- Diff budget about 200 lines; above it, stacked PRs. Nothing beyond the prompt without the user's explicit yes.
- Fail loudly: what failed, why, the next step, a non-zero exit. Never swallow an exception or return an empty success.
- A timeout on every network call; idempotent writes; parameterized SQL; structured logs through the repo's logger, never secrets or PII. The path rules in .claude/rules/ carry the per-language, data and CLI detail.

## Access control
- Authorization in code at the single chokepoint before the side effect, deny by default; identity from the authenticated context, never from caller- or model-supplied arguments; the target's current state checked at write time.
- Tests cover allow, deny (assert zero side effects), missing identity and bulk paths.

## Secrets and shared systems
- Never print, cat, echo or paste secrets, tokens, env vars or .env contents; .env.example lists the key names; assume the terminal is visible to others.
- No push, PR, deploy, migration, external write, shared-database write or dependency install without explicit confirmation. Prefer fixtures, mocks and --dry-run.
- A local guard blocks destructive or secret-revealing commands; when it fires, ask the user to run the command, never work around it.

## Environment and git
- Repo commands (git, tests, make, uv, npm, go) run through the Bash tool, which on Windows is Git Bash: POSIX syntax, forward slashes. Use the repo's runner (`uv run --frozen`, `poetry run`, `npm test`, `npx --no-install`, `go test ./...`); formatters in check mode only.
- Work on a fix/<slug> or feat/<slug> branch, never the default branch; match the `git log` style; commit only when asked.

## Communication and done
- Lead with the decision; keep answers short; state assumptions; narrate the plan before multi-file edits. Ask one precise question rather than guess identity sources, data ownership or environment access.
- Done means: tests added and passing with output shown; lint and typecheck clean or pre-existing failures named; the diff self-reviewed; the PR or submission text covers problem, change, verification, risks and rollback.
