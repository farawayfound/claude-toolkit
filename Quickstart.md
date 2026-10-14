# Quickstart

From a fresh clone to a working setup in a repo, then the shortest useful guide to using it. Needs Node 18+, git and Claude Code. There is nothing to `npm install`.

## 1. Get it

```bash
git clone https://github.com/farawayfound/claude-toolkit.git ~/claude-toolkit
node ~/claude-toolkit/dropin.mjs list          # every part, set and what it needs
```

Keep the clone outside the repos you work in; the installer refuses a target that contains it. On Windows use Git Bash (PowerShell works too with `$HOME\claude-toolkit`).

## 2. Put it in a repo

```bash
cd ~/dev/my-project                            # any git checkout; work on a branch, not the default
node ~/claude-toolkit/dropin.mjs add repo takehome --repo .
claude                                         # accept the trust prompt; restart a running session first
```

`repo` adds the facts block (detected test and lint commands) and the language rules; `takehome` is a set of parts. Nothing appears in `git status`: files go under `.claude/` and `CLAUDE.local.md`, all listed in `.git/info/exclude`. Pick the size you want:

| Want | Command (after `node ~/claude-toolkit/dropin.mjs`) |
|---|---|
| The 60-minute live loop | `add repo live --repo .` |
| Guard and permission rules only | `add safety --repo .` |
| One or two parts | `add check reviewer --repo .` |
| The same parts in every repo on this machine | `add takehome --user`, then per repo `add repo --repo .` |
| Preview any of the above | append `--dry-run` |
| Take it all out again | `remove all --repo .` (or `--user`) |

Opt-in hooks are named explicitly: `add gate --repo .` (blocks finishing while changed code has no passing test run) and `add trail --user` (logs your prompts, redacted, to `~/.claude/logs/trail.jsonl`).

## 3. Check it

```bash
node ~/claude-toolkit/setup/lib/selftest.mjs --quick     # expect no FAIL; WARNs about the real ~/.claude mean the user layer is not installed
```

In a session: `/hooks` shows the guard, `/skills` the commands, `/agents` the four subagents. Fresh Windows laptop from nothing: [setup/SETUP.md](setup/SETUP.md).

## 4. Use it

| Situation | Commands | You get |
|---|---|---|
| Unfamiliar code, one change | `/recon <topic>`, `/scope <task>` (approve), failing test, fix, `/check`, `/break`, `/gate`, `/pr-brief` | A 25-line brief, an approved plan, RED then GREEN with real output, review findings that were reproduced, PR text |
| A take-home or challenge | `/takehome-init <brief>`, `/scope`, thin slice, `/break`, `/deslop`, `/tighten-docs`, `/ship` | A clean repo, a ledger of who decided what, a short README with your own Decisions and AI use, a gate that opens the repo the way a reviewer will |
| A bug | `/repro-fix <symptom>` | Failing test first, root cause in one sentence, minimal fix, sibling sweep |
| Slow or queueing | `/perf-baseline <scenario>` | p50 and p95 with queue wait split out, before and after |
| Who may change what | `/access-control <action>` | Chokepoint, bypasses, deny-by-default matrix, audit line |
| Any decision, as it happens | `/decide "<what>" by: me` | One attributed row in `docs/decisions.md` |

Agents are used by name in plain language: "Use the reviewer agent on the diff against main, one lens: bypasses." They run in their own context, so several can work at once and none sees the main session's assumptions.

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

| To | Do |
|---|---|
| Change an agent's model | Edit the `model:` line in its file under `.claude/agents/` (`inherit` follows the session) |
| Turn the gate off for a repo | `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"` or run with `TK_GATE=off` |
| Turn every hook off | `"disableAllHooks": true` in `~/.claude/settings.json`, then restart `claude` |
| See what the guard decided | `~/.claude/logs/guard.jsonl`, one JSON line per decision |
| Update the toolkit | `git -C ~/claude-toolkit pull`, then re-run the same `add` command; files you edited are kept with a warning |

Parts, sets and the reasoning behind them: [README.md](README.md). Sample prompts for each situation: [docs/examples.md](docs/examples.md).
