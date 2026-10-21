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
```

The installer asks which set to place, and when the parts are in it offers the **team terminal**: on Windows a new Windows Terminal window running psmux (tmux for Windows, native), on macOS and Linux tmux attached in the terminal you are in, with `claude` started in its first pane; every teammate then opens as a pane of its own. Enter accepts. When psmux or tmux is not installed yet it offers to install it (Windows: psmux, PowerShell 7 and the Claude Code CLI through winget, per user, no admin; it takes a minute). `--panes` says yes to both without asking, `--no-panes` skips it, and later, when you come back to the project, `node "$HOME/claude-toolkit/team.mjs"` in its folder only opens it. Without the team terminal, start `claude` yourself in the project's folder; teammates then run in-process. 
The installer asks which set to place. A folder that is not a git repository yet gets a question first: make it one (`git init` and a baseline commit of its files), or stop; `--init` answers yes up front. A folder inside a bigger repository is asked whether to install at that repository's root (Enter) or to become a repository of its own. Every run prints the clone it ran from and the folder to start `claude` in.

Already inside Claude Code? Put `!` before the line at its prompt: `! node "$HOME/claude-toolkit/install.mjs" --set live --init`. There is no menu there, so name the set; then `/exit` and start `claude` again so the hooks and skills load. `install.cmd` and `install.sh` in the clone still work: they forward to `install.mjs` with the same flags.

| Set | Fits | Places |
|---|---|---|
| `full` (Enter) | Everything, no clock | every part except the opt-in Stop gate |
| `live` | A 60 to 90 minute session on someone else's code | the base, `recon`, `scope`, `team`, `repro-fix`, `check`, `deslop`, `pr-brief`; the `test-writer`, `verifier`, `reviewer`, `builder` and `qa` agents; the `trail` prompt log |
| `takehome` | A timed challenge, 90 minutes to 3 hours | the base, `recon`, `takehome-init`, `scope`, `check`, `break`, `deslop`, `tighten-docs`, `ship`, `team`; all six agents; `trail` |
| `unbound` | No time limit, a general set | everything in `live` plus `access-control`, `perf-baseline`, `break`, `tighten-docs`, `parallel`, the `breaker` agent and the `/gate` workflow; no `trail` |

The base in every set: the house rules, the permission rules, the guard, the facts block (detected test and lint commands), the language rules, a blank `.claude/worksheet.md` for the brief (yours to fill in; no re-run rewrites it) and the agent-teams switch. `--set live` skips the question (so do `-Set live` and a plain `live`); a script or a pipe with no set gets `full`. Files go under `.claude/` and `CLAUDE.local.md`, all listed in `.git/info/exclude`, so nothing appears in `git status`, and nothing is written to `~/.claude` or any global settings. On a machine with the older opt-in user layer in `~/.claude`, every set adds only what that layer lacks.

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
| Take it all out of one project | Terminal, in that project's folder | Worktrees first (`git worktree remove [path]`; their hooks point at this checkout), then `node "$HOME/claude-toolkit/install.mjs" --uninstall` (a worksheet you filled in stays, hidden from git) |

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
| The brief is being read out | In your editor, not at the Claude Code prompt: fill in `.claude/worksheet.md`, typing after the colons (overview, tasks with sub-tasks, acceptance criteria, constraints, guardrails; copy a line to add another). Then `/recon`, and `/scope issues: .claude/worksheet.md; constraints: its CONSTRAINTS section; rules: its GUARDRAILS section` | A written record of what was asked that `/recon` and `/scope` read instead of asking again; the file stays out of git |
| Unfamiliar code, several issues | `/recon` (no brief needed; it writes `.claude/plan/recon.md` and asks for the issues, constraints and rules), then `/scope issues: [paths or text]; constraints: [...]; rules: [...]` (approve the plans), then `/team build` | One plan file per issue in `.claude/plan/`, ranked by fix velocity; one builder teammate per plan in its own worktree and branch, a qa teammate running the checks and adversarial tests; a PR brief per branch |
| Unfamiliar code, one change | `/recon [topic]`, `/scope issues: [the change in one sentence]`, approve, then `build plan 01 here`, `/check`, `/deslop [base branch]`, `/team review [base branch]` (or `Use the reviewer agent on the diff`), then `/pr-brief` | RED before the fix, real check output, a review with evidence, PR text you read before pushing |
| A take-home or challenge | `/takehome-init [path to the brief file]`, `/scope [path to the brief file]`, then the thin slice, `/break [entrypoint]`, `/deslop [base branch]`, `/tighten-docs`, `/ship` | A clean repo, a ledger of who decided what, a short README with your own Decisions and AI use, a gate that opens the repo the way a reviewer will |
| A bug | `/repro-fix [the symptom]`; several plausible causes: `/team hunt [the symptom]` first | Failing test first, root cause in one sentence, minimal fix, sibling sweep |
| Slow or queueing | `/perf-baseline [the scenario]` | p50 and p95 with queue wait split out, before and after |
| Who may change what | `/access-control [the action or resource]` | Chokepoint, bypasses, deny-by-default matrix, audit line |
| Plans already approved | `/team build` (or `/team build .claude/plan/01-*.md .claude/plan/02-*.md` for some of them) | A worktree and branch per plan, named teammates `build-[N]-[slug]` and `qa`, evidence per task; the lead re-runs the decisive command and records the verdict in `.claude/plan/index.md` |
| Several issues at once | `/parallel plan [issue numbers]`, then in a terminal the `wt-new` line it prints and `wtc [issue]` per window; before merging, `/parallel check` | A table of files, overlaps and launch order; one worktree, branch and named plan-mode session per issue; conflicts and PR claims checked |

Teammates appear in the agent list below the prompt: arrow keys select one, Enter opens it to talk to it, `x` stops it, Ctrl+T shows the shared task list. In a tmux session with `teammateMode: "tmux"` (section 4b) every teammate gets its own pane instead. Each teammate is a full session, so `/team` says how many it will spawn before it does. Start `claude` in the folder that holds `.claude/settings.local.json`: a session started in a subfolder does not read it, and then no teammate can be spawned.

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
| `builder` | Teammate: builds one plan from `.claude/plan/` in its own worktree and branch, RED first, QA hand-off, PR brief | The plan's files only |
| `qa` | Teammate: re-runs checks per worktree, adversarial inputs through the real entrypoints, regression tests for confirmed gaps, grades the tests | Test files only |

## 4b. Teammates in panes

Each teammate in its own pane needs a tmux: real tmux on macOS and Linux, **psmux** (tmux for Windows, native, no WSL) on Windows; Claude Code drives both the same way. Step 2 sets it up and opens it; these are the pieces behind that, for when you want them by hand:

| Want | Run in | Command |
|---|---|---|
| The team terminal again, for a project that already has the toolkit (a new window on Windows; claude in the first pane, teammates in panes; an open session is reattached) | Any terminal, in your project's folder | `node "$HOME/claude-toolkit/team.mjs"` |
| Two windows: psmux on the left half of the screen, VS Code on the right | PowerShell, in your project's folder | `& "$HOME/claude-toolkit/tmux.cmd" -Open .` |
| The Windows setup alone (psmux, PowerShell 7, the Claude Code CLI, `~/.psmux.conf`, `teammateMode: "auto"`) or its status | PowerShell, any folder | `& "$HOME/claude-toolkit/tmux.cmd"`; status: `& "$HOME/claude-toolkit/tmux.cmd" -Check`. In cmd: `"%USERPROFILE%\claude-toolkit\tmux.cmd"` |
| The macOS or Linux setup alone (tmux, Node 18+, git, Claude Code, `~/.tmux.conf`, `teammateMode: "auto"`) | Terminal | `bash "$HOME/claude-toolkit/setup/tmux.sh"`; status: add `--check` |
| A session by hand | inside a Windows console or terminal, in your project's folder | `tmux new-session -A -s [name]`, then `claude` (open a new terminal first if `tmux` is not found right after the setup) |

Inside the session: `claude`, `/recon`, `/scope ...`, `/team build`. Each teammate opens as a pane with its name in the border (`tmux list-panes` lists them); click into one to talk to it, and the pane closes when the teammate shuts down. Detach with Ctrl+b then d; the session keeps running and `--panes` reattaches. `setup/tmux/psmux.conf` and `setup/tmux/tmux.conf` hold the pane and status settings. `teammateMode: "auto"` means panes only inside a session; in VS Code's chat or a plain terminal the team stays in-process, listed under the prompt.

## 5. Habits that make it work

- Approve the plan before any edit; see RED before the fix; read the exit code, not the summary.
- Treat an agent's or a teammate's report as a claim and re-run its decisive command.
- Decisions are recorded where they happen: the plan's Decisions table, and `docs/decisions.md` in a take-home. `me` is a call you made, `agent (accepted)` a default you approved, `agent (changed)` a proposal you overruled.
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
