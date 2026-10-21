# Plan <rank>: <issue id> <title>

branch `fix/<N>-<slug>` · worktree `<repo>.wt/<N>-<slug>` · size S|M|L · relation: disjoint | needs <plan> | same lines as <plan>
recon `.claude/plan/recon.md` @ <hash> · run from `<dir>` · install `<cmd or none>` · test `<cmd>` · checks `<lint, typecheck, format --check>`

## Goal
<one sentence>. Done when: <observable result: the cases below pass, the checks are clean, the diff is within budget>.

## Issue (verbatim)
<the issue text, or R1..Rn quoted, never paraphrased>

## Constraints and ground rules
- <constraint, verbatim>
- <rule, verbatim: branching, commits, review, what may not change>

## Map (from recon, file:line)
- Cause or gap: <file:line> <one sentence>
- Path: <entry file:line> -> <step> -> <side effect file:line>; chokepoint <file:line>; bypasses <file:line | none>
- Mirror: tests like <file>; errors like <file:line>; commit subject like `<example>`

## Acceptance cases
| case | input | expected | proves |
|---|---|---|---|

## Files (owned by this plan only)
| file | change | like |
|---|---|---|
Must not touch: <files owned by other plans>. Diff budget ~<n> lines. Non-goals: <refactors, renames, adjacent bugs, config and dependency changes>.

## Steps
1. RED: the cases above as failing tests, test files only, mirroring the test named under Map; run only them; quote the exit code and the failing assertion. A case that already passes means the gap is elsewhere: tell the lead before fixing.
2. `Root cause: <file:line> <one sentence>` before the first edit; then the smallest fix at the cause. Never edit a test to fit the behaviour.
3. GREEN: the same tests, then the repo's checks (format in check mode, lint, typecheck, tests); failures labelled new or pre-existing against recon's baseline.
4. Message `qa`: branch, files changed, test command, cases covered. Fix what it CONFIRMS at the cause with a test each; list PLAUSIBLE findings under follow-ups.
5. Commits only when the rules allow: the test commit first, then the fix, subjects in the repo's style. PR brief: follow `.claude/skills/pr-brief/SKILL.md` steps 1-6 and write it to `.claude/plan/<rank>-<N>-pr.md`. Never push.

## Evidence required
Every claim with a command and its exit code or a file:line; anything that could not run as `not verified: <reason>`.

## Decisions
| # | decision | by | alternatives | why |
|---|---|---|---|---|

## Log (appended by the builder: time · what · evidence)
