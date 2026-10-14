---
name: pr-brief
description: "Use when a verified change is ready for review: drafts the PR title and description (problem, change, verification, measurement, risks, rollback, follow-ups) from the diff and the real check output."
disable-model-invocation: true
argument-hint: "[base-branch]"
allowed-tools: "Bash(git merge-base:*)"
---

# PR brief

Draft the PR title and body from the diff and real check output. Print them; write no files; open a PR only when asked. Base branch argument (empty means detect): $ARGUMENTS

## Steps
1. **Base.** The argument if given; else `git merge-base HEAD origin/HEAD`; else `main`, then `master`. Gather `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`, and `git status --short` plus `git diff --stat` for uncommitted changes (name them; they are not in the PR until committed).
2. **Evidence.** Use the latest /check output from this session (or the checks you ran by hand). If there is none, or code changed after it, run the checks first. Copy commands and pass/fail lines exactly.
3. **Preflight.**
   - `git branch --show-current` must not be the default branch; if it is, suggest `fix/<slug>` or `feat/<slug>` and stop.
   - Secret scan: `git diff <base>... | rg -i "api[_-]?key|secret|token|password|BEGIN .*PRIVATE" -o -n`; `-o` prints only the keyword. Review each hit with the user; never paste a value.
   - Debug leftovers: `git diff <base>... | rg -n "^\+.*(console\.log|debugger|print\(|fmt\.Print)"`; remove them or explain.
4. **Title.** Imperative, at most 72 characters, no trailing period, e.g. `Enforce owner check on bulk update`.
5. **Body.** At most 40 lines, plain statements of fact: no adjectives, marketing language or emojis. Use this template:

```
## Problem
<observed behaviour, who is affected, issue link if any>

## Change
- <file or component>: <what changed and why>

## Verification
- `<command>`: <pass/fail line copied from output>
- Regression test `<name>`: failed before the fix, passes after (omit if none).
- Review: <reviewer or /gate verdict; /break verdict; findings fixed; findings deferred>
- not verified: <reason> (omit if none)

## How to measure in production
<log field, metric or query, and the value that shows it works>

## Risks
- <risk>: <mitigation>

## Rollback
<revert this PR | turn off <flag>>; data changes: <none | how to undo>

## Out of scope / follow-ups
- <item>
```

6. **Print** the title and body, then stop.
7. **Open the PR only when the user asks.** If the branch has no upstream, push it first with `git push -u origin HEAD` (it asks for confirmation). Then:

```
gh pr create --draft --title "<title>" --body-file - <<'EOF'
<body>
EOF
```

   The guard asks for confirmation. If /commit-commands:commit-push-pr is installed and the user prefers it, hand off the title and body to it instead. For review, use the reviewer agent or /pr-review-toolkit:review-pr, whichever is installed; do not duplicate it here.
8. Never force-push and never push to the default branch.
