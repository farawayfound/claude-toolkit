# Full setup: a fresh Windows 11 laptop from nothing to a verified Claude Code setup

Two layers, each a script at the toolkit root. The parts themselves are documented in [`../README.md`](../README.md). No Claude config is written outside the repos you install into.

- **Machine layer**: `bootstrap.cmd` installs the toolchain with winget (binaries only, no Claude config). Logic: `setup/bootstrap-machine.ps1`.
- **Repo layer**: `install.mjs` (any terminal: `node "$HOME/claude-toolkit/install.mjs"`; `install.cmd` and `install.sh` forward to it) asks which set to place (full, live, takehome or unbound) and runs `dropin.mjs add <set> --repo` in one checkout, under `.claude/` and `CLAUDE.local.md`, listed in `.git/info/exclude`; git never sees it and nothing lands in `~/.claude`. Run it from the toolkit clone, once per repo.
- **Teammates in their own panes**: `tmux.cmd` on Windows (psmux, tmux for Windows, plus PowerShell 7 and the Claude Code CLI, all per user through winget and the official installer; `~/.psmux.conf` from `setup/tmux/psmux.conf`) or `bash setup/tmux.sh` on macOS and Linux (tmux, Node 18+, git, Claude Code, `~/.tmux.conf` from `setup/tmux/tmux.conf`). Both set `teammateMode: "auto"` in `~/.claude/settings.json`: panes inside a tmux session, in-process elsewhere. `tmux.cmd -Open [repo]` opens Windows Terminal with a psmux session in the repo on the left half and VS Code on the right. Logic: `setup/tmux.ps1`, `setup/tmux.sh`.
- `selftest.ps1` proves the wiring end to end (`setup/lib/selftest.mjs`): static checks on the parts, hook contracts, drop-in round trips in sample repos (including that nothing is written to HOME), the parallel scripts, toolchain smoke, and optional live probes.
- Opt-in only: `install-global.ps1` still builds the old user layer in `~/.claude` (every part, settings defaults, a `~/.claude/dev-toolkit` mirror, plugins for every repo). Nothing on this page needs it.

## Quickstart (Windows 11)

**Run in: a normal (non-admin) PowerShell terminal, in the folder you cloned the toolkit into** (for example `cd $HOME\claude-toolkit`). `[square brackets]` anywhere on this page are yours to replace; type the rest as written.

1. `.\bootstrap.cmd` (approve UAC prompts; exit 3 means reboot, then run it again)
2. Open a new terminal, then `.\bootstrap.cmd -Check` until every core row is OK
3. `claude` (browser login once, then type `/exit` at its prompt)
4. `.\selftest.ps1 -Quick` (no FAIL; the `~/.claude` rows SKIP when no user layer exists, which is expected)
5. Per repo, from its folder, in any terminal: `node "$HOME/claude-toolkit/install.mjs"` (it asks which set, and offers `git init` when the folder is not a repository yet; `--set live` skips the question). Parts on top: `node "$HOME/claude-toolkit/install.mjs" [part] [another part]`.
6. Optional, per repo: the plugins the house rules mention, scoped to that repo only: `claude plugin install commit-commands@anthropic-plugin-directory --scope local` and the same for `pr-review-toolkit`. Without them the `reviewer` agent covers review.
7. Optional: `.\selftest.ps1 -Live` (real headless probes, a few cents).
8. Optional, teammates in their own panes: `.\tmux.cmd` (psmux, PowerShell 7, the Claude Code CLI; no admin, no WSL), then `.\tmux.cmd -Open [path to your project]`. In the pane the repo line is unchanged: `node "$HOME/claude-toolkit/install.mjs" --set live`.

## What lands where
| Part | Lands in |
|---|---|
| `modules/house-rules/CLAUDE.md` | A marker block at the top of `[repo]/CLAUDE.local.md` |
| `modules/permissions/settings.json` | Merged into `[repo]/.claude/settings.local.json` |
| `modules/guard/` (`guard.mjs`, `guard-rules.mjs`, hook registration) | `[repo]/.claude/hooks/tk/`, registered in `.claude/settings.local.json`; decisions logged to `[git dir]/dev-toolkit-logs/guard.jsonl` |
| `modules/gate/` (`gate.mjs`, four hook registrations) | `[repo]/.claude/hooks/tk/` with `-Gate` / `--gate` only |
| `modules/facts/detect.mjs` | `[repo]/.claude/hooks/tk/`; the facts block in `[repo]/CLAUDE.local.md`; `Bash([detected command]:*)` allow rules in `[repo]/.claude/settings.local.json` |
| `modules/skills/*`, `modules/agents/*` | `[repo]/.claude/skills/`, `[repo]/.claude/agents/`; a skill folder brings its reference files and scripts (`parallel` brings `scripts/wt-*`, `wtc`, `statusline.mjs`) |
| `modules/gate-workflow/gate.js` | `[repo]/.claude/workflows/`, plus `enableWorkflows: true` in `.claude/settings.local.json` when absent |
| `modules/trail/` (live and takehome sets, else `dropin add trail`) | `[repo]/.claude/hooks/tk/trail.mjs` and a UserPromptSubmit registration; prompts logged to `[git dir]/dev-toolkit-logs/trail.jsonl` |
| `modules/teams/` (every named set, else `dropin add team`) | `[repo]/.claude/hooks/tk/teams.mjs`, `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and TaskCreated, TaskCompleted and TeammateIdle registrations in `.claude/settings.local.json`; events logged to `[git dir]/dev-toolkit-logs/teams.jsonl` |
| `modules/rules/tk-*.md` | `[repo]/.claude/rules/` |
| `wt-workspace` (parallel, on request) | `[repo].code-workspace` beside the clone; its settings apply only in that VS Code workspace |
| `wt-new` (parallel, on request) | `[repo].wt/[N]-[slug]/`, git worktrees beside the clone, each with a copy of the main checkout's git-ignored Claude config |
| bookkeeping | `dev-toolkit.json` and an `info/exclude` block in the git dir; hashes for exact removal |

Backups: the first settings change in a repo backs up `.claude/settings.local.json` under `[git dir]/dev-toolkit-backup/` (only when it existed).

## Flags
| bootstrap.cmd | Effect |
|---|---|
| `-Check` | Status table and manual steps only; installs nothing |
| `-WhatIf` (or `-DryRun`) | Dry run: prints every install it would perform |
| `-Minimal` | Skip WSL2, Docker Desktop and PostgreSQL (overrides `-PostgresServer`) |
| `-GCloud` / `-PostgresServer` | Add the Google Cloud SDK / full PostgreSQL 17 server instead of client-only |
| `-Lsp` | pyright, typescript-language-server, gopls |
| `-ExtraNpm "a,b"` | Extra global npm packages (quote the list) |
| `-PresentationSettings` | Opt-in, and it writes your VS Code user settings: font 16, zoom 1, dark theme, Git Bash terminal (`node setup\lib\install.mjs vscode-settings` does the same alone). For one repo instead, `wt-workspace` writes a workspace file with its own settings |
| exit codes | 0 core OK, 1 a core tool missing, 3 reboot required |

| install.mjs (install.cmd, install.sh) | selftest.ps1 |
|---|---|
| `--target [dir]` (`-Target`, or the folder as a plain word), default: current dir | `-Quick`: skip toolchain runs |
| No set: asks which set (full, live, takehome, unbound); with input redirected, `full` (every part except the opt-in Stop gate; with the opt-in user layer, only what that layer lacks) | `-Live`: real headless claude probes |
| `--set [name]` (`-Set`, or the name as a plain word; several add up): that set, or any set or part name, without asking (`repo`, `safety`, `all` included) | `-Keep`: keep and print the sample repos |
| `--gate`: the opt-in Stop gate on top; `--init`: `git init` and a baseline commit when the folder is not a repository root; `--update`: `git pull` the clone first | `-Banned "[csv]"`: whole-word scan of every file |
| `--dry-run` (`-DryRun`, `-WhatIf`), `--uninstall` (= `dropin remove all`), `--force`; one or two dashes, any case | |
| exit 0 ok, 1 leak/failure, 2 usage/not a repo/refused, 3 no node, node before 18, or no git | exit 0 no FAIL, 1 any FAIL, 3 no node |

| tmux.cmd (setup/tmux.ps1) | setup/tmux.sh |
|---|---|
| No flag: install what is missing (psmux, pwsh, claude, `~/.psmux.conf`, `teammateMode`), then the status table | No flag: install what is missing, then the status table |
| `-Check`: report only; `-WhatIf` (or `-DryRun`): print what would run | `--check`; `--dry-run` |
| `-Open [repo]`: the split layout (psmux left, VS Code right) | |
| exit 0 ready, 1 missing or failed | exit 0 ready, 1 missing, 2 usage |

`install-global.ps1` (opt-in user layer) keeps its own flags in its header: `-Plugins`, `-Model`, `-Effort`, `-DryRun`, `-Uninstall`, `-Home`.

Every script stops on an unknown or misspelled flag before doing anything: the `.ps1` scripts with a PowerShell error, `install.mjs` and `dropin.mjs` with exit 2.

## Kill switches and removal
- Gate off in one repo: `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"` (Git Bash), `New-Item -ItemType File -Force (git rev-parse --git-path dev-toolkit-gate-off)` (PowerShell), or env `TK_GATE=off`.
- All hooks off in one repo: `"disableAllHooks": true` in `[repo]/.claude/settings.local.json`, then restart `claude`.
- Full removal, in this order: `git worktree remove [path]` for each worktree `wt-new` made (their hooks point at the main checkout's); then `node "$HOME/claude-toolkit/install.mjs" --uninstall` in each repo; delete `[repo].code-workspace` if `wt-workspace` wrote one, and `.git/dev-toolkit-logs/` if you want the logs gone. Repo-scoped plugins: `claude plugin uninstall [name]@anthropic-plugin-directory --scope local`. If you ever installed the opt-in user layer: `.\install-global.ps1 -Uninstall`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `command not found`, or STALE-PATH in the table | Open a new terminal; re-run `.\bootstrap.cmd -Check`; STALE-PATH that persists: re-run `.\bootstrap.cmd` |
| A folder named `~` appeared in a project, or PowerShell says `The module '~' could not be loaded` | The clone ran with `~` unexpanded. Clone again with `git clone https://github.com/farawayfound/claude-toolkit.git "$HOME/claude-toolkit"`, then delete the stray folder by its full path: `Remove-Item -Recurse -Force -LiteralPath '[project folder]\~'` (`-Force` because git's object files are read-only; never a bare `~`, which is your home folder). The installer prints both lines when run from such a clone |
| `bash` is not recognized, or starts WSL | Nothing here needs it: `node "$HOME/claude-toolkit/install.mjs"` |
| "is not a git repository" | `--init` (or yes at the prompt) makes the folder one with a baseline commit; or clone the project first |
| winget missing | `Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe` or App Installer from the Store |
| Script blocked by execution policy or "downloaded from the internet" | Use `bootstrap.cmd`; or `Get-ChildItem -Recurse \| Unblock-File` in the toolkit folder |
| `python` opens the Microsoft Store | Settings > Apps > Advanced app settings > App execution aliases: off for python.exe/python3.exe; or use `uv run python` |
| WSL or virtualization errors | `wsl --update`; enable VT-x/virtualization in BIOS; reboot |
| `/team` says no team tool, or teammates never appear | Start `claude` in the folder that holds `.claude/settings.local.json` (a subfolder does not read it, so the teams switch is off there); re-run `node "$HOME/claude-toolkit/install.mjs" --set live` in that folder if needed. Teammates are `Agent` calls with a `name`, not a separate tool |
| Teammates run in-process although panes are wanted | `claude` must run inside a tmux or psmux session (`tmux new -A -s [name]`) with `teammateMode` `auto` or `tmux` in `~/.claude/settings.json`; `.\tmux.cmd -Check` or `bash setup/tmux.sh --check`. `tmux list-panes` shows one pane per teammate once a team spawns; `claude --debug-file [log]` writes `[BackendRegistry] Selected: tmux` when panes are on |
| WSL2 wanted instead (`setup/tmux.sh` inside Ubuntu) | `wsl --install`, reboot, `wsl --install -d Ubuntu`. If `wsl` then reports `HCS_E_HYPERV_NOT_INSTALLED` with `HypervisorPresent False` and the System log shows Hyper-V-Hypervisor event 26 at every boot, the hypervisor is not starting on that machine (see microsoft/WSL#14384); use psmux instead |
| bootstrap exits 3 again after the reboot | `wsl --version`: if it prints a version, WSL is in; continue with `.\bootstrap.cmd -Check` |
| selftest P1 FAIL "stale terminal PATH" | Tools were installed after this terminal or VS Code started: open a new terminal (restart VS Code), then re-run |
| Docker Desktop stuck starting | `wsl --shutdown`, then start Docker Desktop again |
| "hook error" on every tool call | Re-run `node "$HOME/claude-toolkit/install.mjs"` in that repo, then `.\selftest.ps1 -Quick`; meanwhile `disableAllHooks` in `.claude/settings.local.json` |
| Plugin not found | `claude plugin marketplace update anthropic-plugin-directory`, then the step 6 install again |
| settings.local.json broken | Restore the backup under `[git dir]/dev-toolkit-backup/`; the installer never overwrites invalid JSON |
| Claude Code cannot find Git Bash | Add `"env": {"CLAUDE_CODE_GIT_BASH_PATH": "C:/Program Files/Git/bin/bash.exe"}` to `[repo]/.claude/settings.local.json` (the opt-in user layer used to set it globally) |
| `wt-new` or `wtc`: command not found | Outside the workspace `wt-workspace` wrote, call them by path: `.claude/skills/parallel/scripts/wt-new`. Inside it, trust the workspace (its PATH setting applies only then), then open a new terminal |
| `npm warn allow-scripts` lines | Handled: bootstrap retries once with `--allow-scripts=[names]` |
| Gate keeps asking for tests | Run the test command and show its output, or use the gate off switch above |
| install exits 1 "leaked" | A tracked path collided; read the listed paths, then `--uninstall` |
| A part was edited after install and is "kept" | Intended: the tool never overwrites what it does not own. `--force` on add replaces it; remove by hand otherwise |

## MCP
CLIs first (`gh`, `psql`): they cost no context. When a UI must be driven: `claude mcp add --transport stdio playwright -s local -- npx -y @playwright/mcp@latest`. `setup/mcp.json.example` is reference only; no script installs it.
