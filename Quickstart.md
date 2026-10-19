# Quickstart

From a fresh clone to a working setup in a repo, then the shortest useful guide to using it. Needs Node 18+, git and Claude Code. There is nothing to `npm install`.

**How to read the commands**

- `[square brackets]` mean replace this with your own value, and do not type the brackets. Everything not in brackets is copy-paste exactly as written.
- Every block says where to run it:
  - **Terminal** is Git Bash on Windows, or any shell on macOS and Linux. In PowerShell, write `$HOME\claude-toolkit` where this page says `~/claude-toolkit`.
  - **Claude Code** means type it at the prompt of a running `claude` session, not in a terminal. Start one with `claude` from your project's folder.
- `~/claude-toolkit` is where step 1 puts the clone. If you clone somewhere else, use that path instead.

## 1. Get it

**Run in: Terminal, any folder.**

```bash
git clone https://github.com/farawayfound/claude-toolkit.git ~/claude-toolkit
node ~/claude-toolkit/dropin.mjs list
```

The second command prints every part, every set and what each one needs. Keep the clone outside the repos you work in; the installer refuses a target that contains it.

## 2. Put it in a repo

**Run in: Terminal, inside your project's folder** (the root of a git checkout):

```bash
cd [path to your project]
bash ~/claude-toolkit/install.sh
claude
```

`install.sh` places every part (except the opt-in hooks) in this checkout: files go under `.claude/` and `CLAUDE.local.md`, all listed in `.git/info/exclude`, so nothing appears in `git status`, and nothing is written to `~/.claude` or any global settings. On a machine that has the older opt-in user layer in `~/.claude`, it adds only what that layer lacks, so nothing loads twice; `--full` places every part anyway. It includes the facts block (detected test and lint commands) and the language rules. `claude` starts a session in this folder (accept the trust prompt; restart any session that was already running). In PowerShell: `& "$HOME\claude-toolkit\install.ps1"`.

Other sizes. Each command runs where its row says, and `--repo .` means "the folder you are in":

| Want | Run in | Command |
|---|---|---|
| The 60-minute live loop only | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add repo live --repo .` |
| The take-home loop only | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add repo takehome --repo .` |
| Several issues at once (worktree, branch and session per issue) | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add parallel --repo .` (also in `live`); then step 4 |
| Guard and permission rules only | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add safety --repo .` |
| Specific parts | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add [part] [another part] --repo .` (names come from step 1, for example `check reviewer`) |
| One part by hand, no installer | Terminal, in your project's folder | `mkdir -p .claude/skills && cp -r ~/claude-toolkit/modules/skills/[skill] .claude/skills/`, or `mkdir -p .claude/agents && cp ~/claude-toolkit/modules/agents/[agent].md .claude/agents/`; on macOS or Linux also `chmod +x .claude/skills/[skill]/scripts/*` when the skill has scripts; add the copied paths to `.git/info/exclude` yourself |
| The gate: blocks finishing while changed code has no passing test run | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add gate --repo .` |
| A log of your prompts, redacted, in the repo's git dir | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add trail --repo .` |
| Preview any add or remove | the same place as that command | put ` --dry-run` at the end; nothing is written |
| Take it all out of one project | Terminal, in that project's folder | Worktrees first (`git worktree remove [path]`; their hooks point at this checkout), then `bash ~/claude-toolkit/install.sh --uninstall` (or `node ~/claude-toolkit/dropin.mjs remove all --repo .`) |

## 3. Check it

**Run in: Terminal, any folder:**

```bash
node ~/claude-toolkit/setup/lib/selftest.mjs --quick
```

Expect no FAIL. The rows about the real `~/.claude` say SKIP when the optional user layer is absent, which is the normal state.

**Run in: Claude Code,** one per line:

```
/hooks
/skills
/agents
```

They show the guard, the commands and the four subagents. A fresh Windows laptop from nothing: [setup/SETUP.md](setup/SETUP.md).

## 4. Use it

**Run in: Claude Code,** in the session you started in step 2. Type the lines in order and replace what is in brackets.

| Situation | What you type | You get |
|---|---|---|
| Unfamiliar code, one change | `/recon [topic, for example update deal]`, then `/scope [the change in one sentence]` (approve the plan), then ask for the failing tests, then `/check`, `/break [feature or entrypoint]`, `/gate [base branch, for example main]`, `/pr-brief [base branch]` | A 25-line brief, an approved plan, RED then GREEN with real output, review findings that were reproduced, PR text |
| A take-home or challenge | `/takehome-init [path to the brief file]`, `/scope [path to the brief file]`, then the thin slice, `/break [entrypoint]`, `/deslop [base branch]`, `/tighten-docs`, `/ship` | A clean repo, a ledger of who decided what, a short README with your own Decisions and AI use, a gate that opens the repo the way a reviewer will |
| A bug | `/repro-fix [the symptom]` | Failing test first, root cause in one sentence, minimal fix, sibling sweep |
| Slow or queueing | `/perf-baseline [the scenario]` | p50 and p95 with queue wait split out, before and after |
| Who may change what | `/access-control [the action or resource]` | Chokepoint, bypasses, deny-by-default matrix, audit line |
| Any decision, as it happens | `/decide "[what was decided]" by: [me, or agent (accepted), or agent (changed)]` | One attributed row in `docs/decisions.md` |
| Several issues at once | `/parallel plan [issue numbers]`, then in a terminal the `wt-new` line it prints and `wtc [issue]` per window; before merging, `/parallel check` | A table of files, overlaps and launch order; one worktree, branch and named plan-mode session per issue; conflicts and PR claims checked |

For several issues, the scripts sit in `.claude/skills/parallel/scripts/`. Run in: Terminal, in your project's folder:

```bash
.claude/skills/parallel/scripts/wt-workspace          # writes [project].code-workspace beside the clone; open it with code
.claude/skills/parallel/scripts/wt-new 12:authz 14:paging   # or just wt-new in that workspace's terminals
```

The workspace file puts the scripts on the PATH of its own terminals (after you trust the workspace), so `wt-new`, `wtc 12`, `wt-board 10` and `wt-conflicts` work by name there. `wtc` starts each session with its name, plan mode, a status line showing the folder and branch, and the terminal bell when it waits, all through flags for that session only. Commit before review or stacking: `wt-conflicts` and `WT_BASE` stacks see commits, not the working tree.

Agents are used by name in plain language, typed the same way:

```
Use the reviewer agent on [the diff against main], one lens: [bypasses].
```

They run in their own context, so several can work at once and none sees the main session's assumptions.

| Agent | Does | Edits? |
|---|---|---|
| `test-writer` | Failing tests first, in the repo's framework, shows RED | Test files only |
| `verifier` | Runs the repo's checks, reports PASS or FAIL with output (sonnet) | Never |
| `reviewer` | Adversarial read of a diff, or one lens or one finding; CONFIRMED needs a reproducer (opus) | Never |
| `breaker` | Mutates inputs, runs the real entrypoints, grades the tests | Scratch files outside the repo |

## 5. Habits that make it work

- Approve the plan before any edit; see RED before the fix; read the exit code, not the summary.
- Treat an agent's report as a claim and re-run its decisive command.
- Log a call with `/decide` when you make it. `me` is a call you made, `agent (accepted)` a default you approved, `agent (changed)` a proposal you overruled.
- Write the README's Decisions and AI use sections yourself; the tools leave a placeholder on purpose.

## Knobs and kill switches

| To | Run in | Do |
|---|---|---|
| Change an agent's model | any text editor | Edit the `model:` line in `[path to your project]/.claude/agents/[agent name].md`. `inherit` follows the session |
| Turn the gate off for one repo | Terminal, in your project's folder | `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"`, or start the session with `TK_GATE=off claude` |
| Turn every hook off in this repo | any text editor | Add `"disableAllHooks": true` to `[path to your project]/.claude/settings.local.json`, then restart `claude` |
| See what the guard decided | Terminal, in your project's main checkout | `tail -n 20 .git/dev-toolkit-logs/guard.jsonl` (one JSON line per decision; worktree sessions log here too) |
| Update the toolkit | Terminal, any folder, then in each project's folder | `git -C ~/claude-toolkit pull`, then re-run the same `add` command; files you edited are kept with a warning |

Parts, sets and the reasoning behind them: [README.md](README.md). Sample prompts for each situation: [docs/examples.md](docs/examples.md).
