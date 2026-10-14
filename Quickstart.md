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
node ~/claude-toolkit/dropin.mjs add repo takehome --repo .
claude
```

`repo` adds the facts block (detected test and lint commands) and the language rules; `takehome` is a set of parts. Nothing appears in `git status`: files go under `.claude/` and `CLAUDE.local.md`, all listed in `.git/info/exclude`. `claude` starts a session in this folder (accept the trust prompt; restart any session that was already running).

Other sizes. Each command runs where its row says, and `--repo .` means "the folder you are in":

| Want | Run in | Command |
|---|---|---|
| The 60-minute live loop | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add repo live --repo .` |
| Guard and permission rules only | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add safety --repo .` |
| Specific parts | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add [part] [another part] --repo .` (names come from step 1, for example `check reviewer`) |
| The same parts in every repo on this machine | Terminal, any folder; then once per project | `node ~/claude-toolkit/dropin.mjs add takehome --user`, then in each project's folder `node ~/claude-toolkit/dropin.mjs add repo --repo .` |
| The gate: blocks finishing while changed code has no passing test run | Terminal, in your project's folder | `node ~/claude-toolkit/dropin.mjs add gate --repo .` |
| A log of your prompts, redacted, in `~/.claude/logs/trail.jsonl` | Terminal, any folder | `node ~/claude-toolkit/dropin.mjs add trail --user` |
| Preview any add or remove | the same place as that command | put ` --dry-run` at the end; nothing is written |
| Take it all out of one project | Terminal, in that project's folder | `node ~/claude-toolkit/dropin.mjs remove all --repo .` |
| Take it all out of `~/.claude` | Terminal, any folder | `node ~/claude-toolkit/dropin.mjs remove all --user` |

## 3. Check it

**Run in: Terminal, any folder:**

```bash
node ~/claude-toolkit/setup/lib/selftest.mjs --quick
```

Expect no FAIL. WARNs about the real `~/.claude` only mean the user layer is not installed.

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
| Change an agent's model | any text editor | Edit the `model:` line in `[path to your project]/.claude/agents/[agent name].md`, or in `~/.claude/agents/[agent name].md` for the user layer. `inherit` follows the session |
| Turn the gate off for one repo | Terminal, in your project's folder | `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"`, or start the session with `TK_GATE=off claude` |
| Turn every hook off | any text editor | Add `"disableAllHooks": true` to `~/.claude/settings.json`, then restart `claude` |
| See what the guard decided | Terminal, any folder | `tail -n 20 ~/.claude/logs/guard.jsonl` (one JSON line per decision) |
| Update the toolkit | Terminal, any folder, then in each project's folder | `git -C ~/claude-toolkit pull`, then re-run the same `add` command; files you edited are kept with a warning |

Parts, sets and the reasoning behind them: [README.md](README.md). Sample prompts for each situation: [docs/examples.md](docs/examples.md).
