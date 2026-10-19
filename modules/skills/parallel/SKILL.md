---
name: parallel
description: "Use when several issues are worked at once, one git worktree, branch and Claude session per issue. plan maps the files each issue touches, the overlaps, stacks and launch order; check proves the branches and PRs do not collide before merge. Read-only: the person creates the worktrees and starts the sessions with the scripts beside this file."
disable-model-invocation: true
argument-hint: "plan <issue numbers> | check"
---

# Parallel: $ARGUMENTS

One issue = one worktree beside the clone (`<repo>.wt/<N>-<slug>`) = one branch (`fix/<N>-<slug>`, from the remote's default branch) = one session. The main clone stays on the default branch and is never edited; this session runs there. Agents work in parallel; the person reviews in series, so every window passes the same gates: plan approved, RED shown, GREEN plus the repo's checks, a commit whose message the person read, an independent review, the PR text read, the push approved.

## Scripts (`${CLAUDE_SKILL_DIR}/scripts/`, run by the person in a terminal)

| Script | Does |
|---|---|
| `wt-new <N>:<slug> ...` | Fetches, then one worktree and branch per issue; copies this checkout's git-ignored Claude config (`.claude/`, `CLAUDE.local.md`) into each; `WT_SETUP="<install>"` installs dependencies in parallel; `WT_BASE=fix/<A>-<slug>` stacks on another issue's committed branch; re-running reuses or reattaches. Exit 2 bad spec, 1 any failure |
| `wtc <N>` | Starts issue N's session in its worktree: `claude -n "#<N>-<slug>" --permission-mode plan`, a status line showing folder and branch, the terminal bell when it waits, no IDE link. `wtc 0` starts this main clone's session. Per session only |
| `wt-board [secs]` | One line per checkout: branch, commits ahead, uncommitted files, newest PR, last commit. The main clone must stay `+0 ~0` |
| `wt-conflicts` | `git merge-tree` on every pair of issue branches and each against the base; committed work only. Exit 1 on a conflict, 2 when there is nothing to check |
| `wt-workspace` | Writes `<repo>.code-workspace` beside the clone: the main clone and the worktrees folder, terminals in the editor area, the visual bell, and these scripts on the PATH of that workspace's terminals only |

## plan <issue numbers>

1. Read the issues the person named, not every open one. For each, one Explore agent, all in one message: `gh issue view <N>`; the files and functions a fix touches (`file:line` pulled with rg or sed, never retyped); the cause in one sentence; size S, M or L; the failing test in one sentence.
2. For every pair, say whether they touch the same function, the same lines, or one needs the other's change.
3. One table, then stop:

| # | Issue (one line) | Files | Size | Relation | Decision |
|---|---|---|---|---|---|

   - Relation: **disjoint** · **needs <M>** (stack on M, after M commits) · **same lines as <M>** (sequence, or parallel with a stated merge order) · **plan-only** (size L, needs credentials, or asks for a rewrite).
   - Decision: a window, a stack, or plan-only with the measurement that would justify more.
4. Launch order: the most important M first; the smallest S second, because it gives the first PR; then by rank; stacks last. At most four issue windows, five only if one is tiny.
5. The exact commands: `wt-new <N>:<slug> ...` (add `WT_SETUP="<install command from CLAUDE.local.md>"` when the repo needs one), then `wtc <N>` per window in launch order, and `WT_BASE=fix/<A>-<slug> wt-new <B>:<slug>` for each stack once A has committed.
6. The person ranks the issues before reading this table. Where the table disagrees with their ranking, say why with `file:line`; they decide.

## check

1. `bash ${CLAUDE_SKILL_DIR}/scripts/wt-conflicts`: show the output verbatim with its exit code.
2. For each open PR (`gh pr list`): compare `gh pr view <n>` with `gh pr diff <n>`. Every claim is backed by the diff or a command's output; `Closes #<N>` is present; the base is right (a stacked PR targets its base issue's branch and says to merge that first).
3. `bash ${CLAUDE_SKILL_DIR}/scripts/wt-board`: the main clone shows `+0 ~0`; anything else means a session wrote outside its worktree.
4. One table, then stop:

| PR | Issue | Base | Conflicts with | Claims backed | Merge order |
|---|---|---|---|---|---|

## Rules

- Read-only: no edits, commits, pushes, PR comments or merges from this skill.
- Uncommitted work is invisible to stacks, reviews and `wt-conflicts`: a branch is committed before it is reviewed or stacked on.
- An Explore agent's `file:line` is a claim until one cited line is opened and matches.
- Removing a worktree removes its copy of the Claude config: `git worktree remove <path>`, run by the person.
