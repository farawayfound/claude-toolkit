---
name: check
description: "Use after any code change and before saying work is done: runs the repository's own format check, lint, typecheck and tests, shows the real output, separates new from pre-existing failures and checks the diff for scope creep."
---

# Check

Run the repository's own checks, cheapest first, and report only what actually ran. In the main session, when other work is running in parallel, delegate long suites to the verifier agent (if installed) and keep working.

## Hard rules
- Never install or upgrade dependencies, or touch lockfiles.
- Never skip, xfail, weaken or delete a test; never change lint, format or typecheck config to get green.
- A result is what the output shows. Predictions are not results.

## 1. Resolve commands
Per purpose, the first source that has one wins: the command table in CLAUDE.local.md; the steps in CI workflows (`.github/workflows/*.yml`); Makefile targets; package scripts (package.json, pyproject, Taskfile). If CLAUDE.local.md is missing and `~/.claude/hooks/detect.mjs` (repo-level: `.claude/hooks/tk/detect.mjs`) exists, it prints the detected commands as JSON. Use the repo's runner (uv run, poetry run, npm run, go).

## 2. Run in this order
1. Format, in CHECK mode only (`--check`, `-l`); never rewrite files unless asked. `gofmt -l` exits 0 even when it lists files: any listed file is a fail.
2. Lint.
3. Typecheck.
4. Targeted tests for the changed code: files in `git diff --name-only HEAD` plus new files from `git ls-files -o --exclude-standard`.
5. The full suite if it takes under about 2 minutes; otherwise write `full suite skipped: ~<n> min, run <cmd>`.

For each step capture the exact command, its exit code and the last ~15 lines of real output. Keep the check's own exit code: trim with `set -o pipefail; <cmd> 2>&1 | tail -15`, never a bare pipe, `;` or `|| true` after it.

## 3. Classify
- Re-run a failing test once on its own; if it then passes, label it `flaky`.
- Compare with the baseline from this session (/orient, or the first run of the suite) and label each failure `new` or `pre-existing`. With no baseline, label it `unknown (no baseline)`; do not stash or reset to find out.
- A check that cannot run (missing tool, service or credentials): `not verified: <missing piece>`, plus the exact command that would run it.

## 4. Churn guard
If the format check flags a touched file, check whether it was clean at HEAD by piping `git show HEAD:<path>` into the formatter's stdin check (e.g. `| gofmt -l`, `| uv run ruff format --check --stdin-filename <path>`, `| npx --no-install prettier --check --stdin-filepath <path>`). Already dirty at HEAD: report it as pre-existing and format only the lines you changed. Never reformat whole legacy files.

## 5. Diff hygiene
1. `git diff --stat HEAD` and `git status --short`: flag files outside the agreed plan and untracked files that should not ship. New untracked files are not in `git diff HEAD`: read them and include them in steps 3-4.
2. `git diff HEAD` read in full: flag edits inside functions the task did not touch, commented-out code and renames nobody asked for.
3. `git diff HEAD | rg -n "^\+.*(console\.log|debugger|print\(|fmt\.Print|TODO|FIXME|XXX)"`: debug prints and TODOs.
4. `git diff HEAD | rg -n -o -i "api[_-]?key|secret|token|password|BEGIN .*PRIVATE"` (`-o` prints the keyword, not the value); review each hit by line number and never paste a matched value.

## Output
```
| Check | Command | Exit | Result |
|-------|---------|------|--------|
| format | <cmd> | <n> | pass / fail (new) / fail (pre-existing) / flaky / not verified: <reason> |
| lint | ... |
| typecheck | ... |
| tests (targeted) | ... |
| tests (full) | ... |
| diff | git diff --stat HEAD | - | <n files, +a/-b>; flags: <none | list> |
```
Then the verbatim output tail (~15 lines) of every failing or not-verified check, then one line:
`Verdict: PASS` (all ran, nothing new failed) | `Verdict: FAIL` (any new failure) | `Verdict: PARTIAL` (nothing new failed, but something was not verified or skipped).
