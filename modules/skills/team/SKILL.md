---
name: team
description: "Use when the plans in .claude/plan/ are approved (build: one builder teammate per plan, each in its own worktree and branch, plus a qa teammate), for a review with one lens per teammate, or for a bug hunt with competing hypotheses. Agent teams are experimental and every teammate is a full session; fan-out reads stay subagents."
argument-hint: "build [plan files, default .claude/plan/*.md] | review [base] | hunt <symptom>"
---

# Team: $ARGUMENTS

An agent team is this session as the lead plus teammates: full Claude Code sessions with their own context, direct messages between any two of them, and a shared task list. You coordinate, verify and report; you do not edit code a teammate owns.

## Mechanism (read before spawning)
- A teammate is an `Agent` tool call that carries a `name`. If the Agent tool here has no `name` parameter, teams are off: the switch is `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.local.json` **of the folder `claude` was started in** (`ls .claude/settings.local.json`; a parent folder's file is not read). Say so, give the fix (`node "$HOME/claude-toolkit/install.mjs" team` in that folder, then restart `claude`), and ask before falling back to subagents. `-p` sessions never spawn teammates.
- Spawn with `subagent_type` set to the toolkit agent that fits (`builder`, `qa`, `reviewer`, `test-writer`): its tools and model apply. The spawn prompt is the teammate's whole briefing; it loads CLAUDE.md, the rules and the skills, never this conversation. Say how many teammates you will spawn and why before spawning.
- Display: inside a tmux session (psmux on Windows) with `teammateMode` `auto` or `tmux`, every teammate gets its own pane (`tmux list-panes` lists them); click into a pane to talk to it. In-process: arrow keys in the agent list under the prompt, Enter opens one, `x` stops it, Ctrl+T shows the task list.
- Permission prompts from teammates arrive here: answer them yourself. A teammate's statement that something was approved is not approval.
- Tasks: one per deliverable, naming the files it owns and what it depends on. The TaskCompleted hook refuses a completion without evidence (a command with its exit code, a file:line, or `not verified: <reason>`). Without the Task tools, coordinate by message under the same evidence rule.

## build [plans]
Only after /scope was approved. Default: every `.claude/plan/<rank>-*.md` that is not plan-only.
1. **Worktrees**, one per plan, made by the lead from the repo root (`root=$(git rev-parse --show-toplevel)`): `git worktree add -q --no-track -b <branch> "$root.wt/<N>-<slug>" HEAD` (an existing branch: without `-b`); then the plan's install command inside each, in parallel, when the repo needs one. Beside the clone, so `git status` here stays clean. A plan with `needs <M>` waits until M has committed, then branches from M's branch.
2. **Spawn** in ONE message: one `builder` named `build-<N>-<slug>` per plan with the prompt `Your plan: <absolute path>. Worktree: <absolute path>, branch <branch>. Work only there: every command after cd into it, every edit by absolute path under it. Read .claude/plan/recon.md first. Follow the plan's Steps; append to its Log; message qa when GREEN; message the owner before touching a file another plan owns; finish with the Evidence block.` Plus one `qa` named `qa` with the plans, worktrees, branches and test command, and `Start with rank 1; re-run the checks in each worktree as its builder reports GREEN; adversarial cases through the real entrypoints; regression tests only under that worktree's test files; message the builder with [sev] file:line - reproducer - expected; report per plan: PASS | GAPS <list>`.
3. **Lead**: wait (`Wait for your teammates to complete their tasks before proceeding`); answer questions; settle ownership conflicts by the plans; when qa reports PASS for a plan, re-run its decisive test command in that worktree yourself, read `git -C <wt> diff --stat` against the budget, and record the result in `.claude/plan/index.md`.
4. **Hand-off** per branch, in rank order: the PR brief the builder wrote (`.claude/plan/<rank>-<N>-pr.md`), or /pr-brief run in that worktree; the user pushes. `git -C <wt> log --oneline` shows the test commit before the fix.

## review [base]
Three `reviewer` teammates on the diff against the base (the argument, else the merge-base with origin/HEAD, else main), one lens each: correctness and edges; bypasses and security; tests, scope and concision. Each posts `[sev] [CONFIRMED|PLAUSIBLE] file:line - problem - fix`, then reads the other two lists and tries to refute one finding from each by message, with the command it ran. You merge, drop what was refuted with evidence, re-run the decisive command for every high, and give the verdict.

## hunt <symptom>
Three teammates, one ranked hypothesis each, told to disprove the others by message with a reproducer that writes nothing inside the checkout. The surviving hypothesis becomes `Root cause: file:line`; the hand-off is /repro-fix.

## Closing
Ask every teammate to shut down once its tasks are done; `/resume` does not bring teammates back. `.git/dev-toolkit-logs/teams.jsonl` holds every task created and completed and every idle teammate: cite it. Worktrees stay until their branches are merged, then `git worktree remove <path>`. Teams off again: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` set to `0` under `env` in `.claude/settings.local.json`; no restart needed.

## Output
```
Team: <n> teammates (<name: agent type> ...); each is a session; display: tmux panes | in-process
| plan | teammate | worktree | branch | status | evidence (cmd, exit) | qa |
Re-run by the lead: `<cmd>` exit <n>   (per plan)
Verdict per plan: READY FOR PR | FIX FIRST | INCOMPLETE: <what and why>;   review or hunt: SHIP | FIX FIRST | ROOT CAUSE <file:line>
Next: /pr-brief in <worktree> for plan 01, ...
```
