# Quickstart

From a fresh clone to a working setup in a repo, then the shortest useful guide to using it. Needs git, Node 18+ and Claude Code; there is nothing to `npm install`. Missing git or Node? Windows: `winget install Git.Git OpenJS.NodeJS.LTS`; macOS: `xcode-select --install` for git and `brew install node` (or the installer from nodejs.org). Open a new terminal afterwards.

**How to read the commands**

- `[square brackets]` mean replace this with your own value, and do not type the brackets. Everything not in brackets is copy-paste exactly as written.
- Every block says where to run it:
  - **Terminal** is any terminal: PowerShell on Windows, Terminal on macOS, Git Bash, a Linux shell (not `cmd.exe`). The install, update, check and removal commands work unchanged in all of them. Lines marked **Git Bash or macOS** use POSIX tools.
  - **Claude Code** means type it at the prompt of a running `claude` session, not in a terminal. Start one with `claude` from your project's folder.
- `"$HOME/claude-toolkit"`, quotes included, is where step 1 puts the clone. Never shorten it to `~/claude-toolkit`: Windows PowerShell hands `~` to git and node unexpanded, so the clone lands in a folder literally named `~` inside whatever folder you are in. The installer refuses to run from such a folder and prints the fix.

## 1. Get it (once per machine)

**Run in: Terminal, any folder.**

```
git clone https://github.com/farawayfound/claude-toolkit.git "$HOME/claude-toolkit"
```

Keep the clone outside the repos you work in; the installer refuses a target that contains it. `node "$HOME/claude-toolkit/dropin.mjs" list` prints every part, every set and what each one needs.

## 2. Put it in a repo

**Run in: Terminal, in your project's folder:**

```
cd [path to your project]
node "$HOME/claude-toolkit/install.mjs"
claude
```

The installer asks which set to place. A folder that is not a git repository yet gets a question first: make it one (`git init` and a baseline commit of its files), or stop; `--init` answers yes up front. A folder inside a bigger repository is asked whether to install at that repository's root (Enter) or to become a repository of its own. Every run prints the clone it ran from and the folder to start `claude` in.

Already inside Claude Code? Put `!` before the line at its prompt: `! node "$HOME/claude-toolkit/install.mjs" --set live --init`. There is no menu there, so name the set; then `/exit` and start `claude` again so the hooks and skills load. `install.cmd` and `install.sh` in the clone still work: they forward to `install.mjs` with the same flags.

| Set | Fits | Places |
|---|---|---|
| `full` (Enter) | Everything, no clock | every part except the opt-in Stop gate |
| `live` | A 60 to 90 minute session on someone else's code | the base, `recon`, `scope`, `decide`, `repro-fix`, `check`, `pr-brief`, `team`; the `test-writer`, `verifier` and `reviewer` agents; the `trail` prompt log |
| `takehome` | A timed challenge, 90 minutes to 3 hours | the base, `recon`, `takehome-init`, `scope`, `decide`, `check`, `break`, `deslop`, `tighten-docs`, `ship`, `team`; all four agents; `trail` |
| `unbound` | No time limit, a general set | everything in `live` plus `access-control`, `perf-baseline`, `break`, `deslop`, `tighten-docs`, `parallel`, the `breaker` agent and the `/gate` workflow; no `trail` |

The base in every set: the house rules, the permission rules, the guard, the facts block (detected test and lint commands), the language rules and the agent-teams switch. `--set live` skips the question (so do `-Set live` and a plain `live`); a script or a pipe with no set gets `full`. Files go under `.claude/` and `CLAUDE.local.md`, all listed in `.git/info/exclude`, so nothing appears in `git status`, and nothing is written to `~/.claude` or any global settings. On a machine with the older opt-in user layer in `~/.claude`, every set adds only what that layer lacks.

Other sizes. Each command runs where its row says; every name you give the installer adds to what is already there:

| Want | Run in | Command |
|---|---|---|
| A set without the question | Terminal, in your project's folder | `node "$HOME/claude-toolkit/install.mjs" --set takehome` |
| More parts on top of a set | Terminal, in your project's folder | `node "$HOME/claude-toolkit/install.mjs" break gate-workflow` (a live slot that turned out to be 90 minutes); another set's name works the same way and only adds |
| Several issues at once (worktree, branch and session per issue) | Terminal, in your project's folder | `node "$HOME/claude-toolkit/install.mjs" parallel` (in `unbound` and `full`); then step 4 |
| Guard and permission rules only | Terminal, in your project's folder | `node "$HOME/claude-toolkit/install.mjs" safety` |
| Specific parts | Terminal, in your project's folder | `node "$HOME/claude-toolkit/install.mjs" [part] [another part]` (names come from step 1, for example `check reviewer`) |
| One part by hand, no installer | Git Bash or macOS, in your project's folder | `mkdir -p .claude/skills && cp -r "$HOME/claude-toolkit/modules/skills/[skill]" .claude/skills/`, or `mkdir -p .claude/agents && cp "$HOME/claude-toolkit/modules/agents/[agent].md" .claude/agents/`; on macOS or Linux also `chmod +x .claude/skills/[skill]/scripts/*` when the skill has scripts; add the copied paths to `.git/info/exclude` yourself |
| The gate: blocks finishing while changed code has no passing test run | Terminal, in your project's folder | `node "$HOME/claude-toolkit/install.mjs" --set live --gate`, or `node "$HOME/claude-toolkit/install.mjs" gate` |
| Agent teams off again, or on for a set that lacks them | any text editor, or a terminal in your project's folder | `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0"` under `env` in `.claude/settings.local.json` (no restart needed); `node "$HOME/claude-toolkit/install.mjs" team` to add the skill and the switch |
| Preview any add or remove | the same place as that command | put ` --dry-run` at the end; nothing is written |
| Take it all out of one project | Terminal, in that project's folder | Worktrees first (`git worktree remove [path]`; their hooks point at this checkout), then `node "$HOME/claude-toolkit/install.mjs" --uninstall` |

## 3. Check it

**Run in: Terminal, any folder:**

```
node "$HOME/claude-toolkit/setup/lib/selftest.mjs" --quick
```

Expect no FAIL. The rows about the real `~/.claude` say SKIP when the optional user layer is absent, which is the normal state.

**Run in: Claude Code,** one per line:

```
/hooks
/skills
/agents
```

They show the guard, the commands and the subagents of the set you placed. A fresh Windows laptop from nothing: [setup/SETUP.md](setup/SETUP.md).

## 4. Use it

**Run in: Claude Code,** in the session you started in step 2. Type the lines in order and replace what is in brackets.

| Situation | What you type | You get |
|---|---|---|
| Unfamiliar code, one change | `/recon [topic, for example update deal]`, then `/scope [the change in one sentence]` (approve the plan), then ask for the failing tests, then `/check`, then `/team review [base branch, for example main]` (or `Use the reviewer agent on the diff, one lens: [bypasses]`; `/break [feature]` and `/gate [base]` when installed), then `/pr-brief [base branch]` | A 25-line brief, an approved plan, RED then GREEN with real output, review findings that were reproduced, PR text |
| A take-home or challenge | `/takehome-init [path to the brief file]`, `/scope [path to the brief file]`, then the thin slice, `/break [entrypoint]`, `/deslop [base branch]`, `/tighten-docs`, `/ship` | A clean repo, a ledger of who decided what, a short README with your own Decisions and AI use, a gate that opens the repo the way a reviewer will |
| A bug | `/repro-fix [the symptom]`; several plausible causes: `/team hunt [the symptom]` first | Failing test first, root cause in one sentence, minimal fix, sibling sweep |
| Slow or queueing | `/perf-baseline [the scenario]` | p50 and p95 with queue wait split out, before and after |
| Who may change what | `/access-control [the action or resource]` | Chokepoint, bypasses, deny-by-default matrix, audit line |
| Any decision, as it happens | `/decide "[what was decided]" by: [me, or agent (accepted), or agent (changed)]` | One attributed row in `docs/decisions.md` |
| A plan with disjoint file sets | `/team build [the approved plan]` | A task per deliverable, RED first, one teammate per file set, a verifier at the end; the lead re-runs the decisive command |
| Several issues at once | `/parallel plan [issue numbers]`, then in a terminal the `wt-new` line it prints and `wtc [issue]` per window; before merging, `/parallel check` | A table of files, overlaps and launch order; one worktree, branch and named plan-mode session per issue; conflicts and PR claims checked |

Teammates appear in the agent list below the prompt: arrow keys select one, Enter opens it to talk to it, `x` stops it, Ctrl+T shows the shared task list. Each teammate is a full session, so `/team` says how many it will spawn before it does.

For several issues, the scripts sit in `.claude/skills/parallel/scripts/`. Run in: Git Bash or macOS, in your project's folder:

```bash
.claude/skills/parallel/scripts/wt-workspace          # writes [project].code-workspace beside the clone; open it with code
.claude/skills/parallel/scripts/wt-new 12:authz 14:paging   # or just wt-new in that workspace's terminals
```

The workspace file puts the scripts on the PATH of its own terminals (after you trust the workspace), so `wt-new`, `wtc 12`, `wt-board 10` and `wt-conflicts` work by name there. `wtc` starts each session with its name, plan mode, a status line showing the folder and branch, and the terminal bell when it waits, all through flags for that session only (`TK_TEAMMATE_MODE=tmux` adds split-pane teams where tmux exists). Commit before review or stacking: `wt-conflicts` and `WT_BASE` stacks see commits, not the working tree.

Agents are used by name in plain language, typed the same way:

```
Use the reviewer agent on [the diff against main], one lens: [bypasses].
```

They run in their own context, so several can work at once and none sees the main session's assumptions. The same files define teammate types for `/team`.

| Agent | Does | Edits? |
|---|---|---|
| `test-writer` | Failing tests first, in the repo's framework, shows RED | Test files only |
| `verifier` | Runs the repo's checks, reports PASS or FAIL with output (sonnet) | Never |
| `reviewer` | Adversarial read of a diff, or one lens or one finding; CONFIRMED needs a reproducer (opus) | Never |
| `breaker` | Mutates inputs, runs the real entrypoints, grades the tests | Scratch files outside the repo |

## 5. Habits that make it work

- Approve the plan before any edit; see RED before the fix; read the exit code, not the summary.
- Treat an agent's or a teammate's report as a claim and re-run its decisive command.
- Log a call with `/decide` when you make it. `me` is a call you made, `agent (accepted)` a default you approved, `agent (changed)` a proposal you overruled.
- Write the README's Decisions and AI use sections yourself; the tools leave a placeholder on purpose.

## Knobs and kill switches

| To | Run in | Do |
|---|---|---|
| Change an agent's model | any text editor | Edit the `model:` line in `[path to your project]/.claude/agents/[agent name].md`. `inherit` follows the session |
| Turn the gate off for one repo | Terminal, in your project's folder | Git Bash or macOS: `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"`, or start the session with `TK_GATE=off claude`. PowerShell: `New-Item -ItemType File -Force (git rev-parse --git-path dev-toolkit-gate-off)` |
| Turn agent teams off for one repo | any text editor | `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0"` under `env` in `[path to your project]/.claude/settings.local.json`; the running session picks it up |
| Turn every hook off in this repo | any text editor | Add `"disableAllHooks": true` to `[path to your project]/.claude/settings.local.json`, then restart `claude` |
| See what the guard decided, or what the team did | Terminal, in your project's main checkout | `tail -n 20 .git/dev-toolkit-logs/guard.jsonl` (PowerShell: `Get-Content -Tail 20 .git/dev-toolkit-logs/guard.jsonl`; one JSON line per decision; worktree sessions log here too); `teams.jsonl` for tasks and idle teammates, `trail.jsonl` for your prompts |
| Update the toolkit | Terminal, in each project's folder | `node "$HOME/claude-toolkit/install.mjs" --update --set [the set you placed]`: pulls the clone, then re-applies the set; files you edited are kept with a warning |

Parts, sets and the reasoning behind them: [README.md](README.md). Sample prompts for each situation: [docs/examples.md](docs/examples.md).
