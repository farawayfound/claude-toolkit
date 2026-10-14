The repository's own CLAUDE.md, AGENTS.md, CONTRIBUTING and CI override these rules.
CLAUDE.local.md (generated) lists the detected commands; confirm them against CI before relying on them.
The skills and agents named here are optional parts; when one is missing, do that step by hand and say so.

## Loops
- One change in an unfamiliar repo: /recon (parallel) or /orient, then /scope and wait for approval, then a failing test first (the test-writer agent, or /repro-fix for a bug), the smallest diff that passes, /check (long suites: the verifier agent in the background), /break (breaker agents on the real entrypoints), the reviewer agent or /gate, then ask the user to run /pr-brief.
- Take-home: /takehome-init, /scope, the thin slice, /break, /deslop, /tighten-docs, /ship. Every decision goes to /decide as it happens, with who made it.
- Slowness or queueing: /perf-baseline with numbers before and after. Who may change what: /access-control.
- Never claim a pass you did not see; quote the command and its exit code. A check that cannot run: `not verified: <reason>`.
- Never skip, xfail, weaken or delete a test, and never change lint, format or type config, to get green.

## Parallel work
- Independent subagents launch in ONE message; keep working while they run. Every brief is self-contained: goal, paths, constraints, done-when, return format (at most 15 lines, file:line evidence).
- Read-only work fans out freely. Parallel writers only on disjoint files; otherwise a worktree (`git worktree add`, then `bash ~/.claude/dev-toolkit/install.sh` inside it).
- Never edit source while its failing test is being written: RED is observed before the fix. A subagent's report is a claim until you re-run its decisive command.

## Code
- The shortest correct, idiomatic change in the surrounding style. Stdlib and existing helpers first; no new dependencies.
- No needless loops, layers, wrappers, config or flags. Comments explain only why. No drive-by refactors, renames or reformatting.
- Diff budget about 200 lines; above it, stacked PRs. Nothing beyond the prompt without the user's explicit yes.

## Errors, I/O and data
- Fail loudly: what failed, why, the next step; a non-zero exit or a proper error status. Never swallow exceptions or return an empty success.
- A timeout on every network call; at most 3 retries with jittered backoff, honouring Retry-After; never retry a non-idempotent write without a key.
- Writes are idempotent; SQL is parameterized; multi-statement writes run in one transaction that also checks the current state (for example the owner).
- Destructive SQL (DROP, TRUNCATE, DELETE or UPDATE without WHERE) only when explicitly requested; migrations reversible and additive first.
- Structured logs (JSON fields, a correlation id) through the repo's logger; never secrets or PII.

## Access control
- Enforce authorization in code at the single chokepoint before the side effect, never in prompts or UI. Deny by default.
- Identity comes from the authenticated context, never from caller- or model-supplied arguments. Check the target's current state at write time; least-privilege scopes.
- Tests cover allow, deny (assert zero side effects), missing identity and bulk paths.

## Tools and CLIs (callers may be models)
- stdout carries data (JSON when not a TTY); logs and errors go to stderr, errors as `{error, code, message, hint, retryable}`.
- Exit codes: 0 ok, 1 general, 2 usage, 3 authentication, 4 authorization, 5 upstream; a repo with its own map keeps it.
- Every write supports `--dry-run` with zero downstream calls; never prompt when stdin is not a TTY; changes stay backward compatible.

## Secrets and shared systems
- Never print, cat, echo or paste secrets, tokens, env vars or .env contents; .env.example lists the key names; assume the terminal is visible to others.
- No push, PR, deploy, migration, external write, shared-database write or dependency install without explicit confirmation. Prefer fixtures, mocks and --dry-run.
- A local guard blocks destructive or secret-revealing commands; when it fires, ask the user to run the command, never work around it.

## Environment and git
- Repo commands (git, tests, make, uv, npm, go) run through the Bash tool, which on Windows is Git Bash: POSIX syntax, forward slashes. Use the repo's runner (`uv run --frozen`, `poetry run`, `npm test`, `npx --no-install`, `go test ./...`); formatters in check mode only.
- Work on a fix/<slug> or feat/<slug> branch, never the default branch; match the `git log` style; commit only when asked.

## Communication and done
- Lead with the decision; keep answers short; state assumptions; narrate the plan before multi-file edits. Ask one precise question rather than guess identity sources, data ownership or environment access.
- Done means: tests added and passing with output shown; lint and typecheck clean or pre-existing failures named; /break run; the diff self-reviewed; docs tightened; the PR or submission text covers problem, change, verification, measurement, risks and rollback.
