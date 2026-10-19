# Full setup: a fresh Windows 11 laptop from nothing to a verified Claude Code setup

Two layers, each a script at the toolkit root. The parts themselves are documented in [`../README.md`](../README.md). No Claude config is written outside the repos you install into.

- **Machine layer**: `bootstrap.cmd` installs the toolchain with winget (binaries only, no Claude config). Logic: `setup/bootstrap-machine.ps1`.
- **Repo layer**: `install.ps1` / `install.sh` run `dropin.mjs add all --repo` in one checkout: every part except the opt-in hooks, under `.claude/` and `CLAUDE.local.md`, listed in `.git/info/exclude`; git never sees it and nothing lands in `~/.claude`. Run it from the toolkit clone, once per repo.
- `selftest.ps1` proves the wiring end to end (`setup/lib/selftest.mjs`): static checks on the parts, hook contracts, drop-in round trips in sample repos (including that nothing is written to HOME), the parallel scripts, toolchain smoke, and optional live probes.
- Opt-in only: `install-global.ps1` still builds the old user layer in `~/.claude` (every part, settings defaults, a `~/.claude/dev-toolkit` mirror, plugins for every repo). Nothing on this page needs it.

## Quickstart (Windows 11)

**Run in: a normal (non-admin) PowerShell terminal, in the folder you cloned the toolkit into** (for example `cd $HOME\claude-toolkit`). `[square brackets]` anywhere on this page are yours to replace; type the rest as written.

1. `.\bootstrap.cmd` (approve UAC prompts; exit 3 means reboot, then run it again)
2. Open a new terminal, then `.\bootstrap.cmd -Check` until every core row is OK
3. `claude` (browser login once, then type `/exit` at its prompt)
4. `.\selftest.ps1 -Quick` (no FAIL; the `~/.claude` rows SKIP when no user layer exists, which is expected)
5. Per repo, from its root, in PowerShell: `& "$HOME\claude-toolkit\install.ps1"`. In a Git Bash terminal: `bash ~/claude-toolkit/install.sh`; never plain `bash` in PowerShell (it can start WSL), use `& "$env:ProgramFiles\Git\bin\bash.exe" "$HOME/claude-toolkit/install.sh"`. One part at a time instead: `node ~/claude-toolkit/dropin.mjs add [part] --repo .`
6. Optional, per repo: the plugins the house rules mention, scoped to that repo only: `claude plugin install commit-commands@anthropic-plugin-directory --scope local` and the same for `pr-review-toolkit`. Without them the `reviewer` agent covers review.
7. Optional: `.\selftest.ps1 -Live` (real headless probes, a few cents).

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
| `modules/trail/` (opt-in) | `[repo]/.claude/hooks/tk/trail.mjs` and a UserPromptSubmit registration, only with `dropin add trail`; prompts logged to `[git dir]/dev-toolkit-logs/trail.jsonl` |
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

| install.ps1 (install.sh) | selftest.ps1 |
|---|---|
| `-Target [dir]` (`--target`), default: current dir | `-Quick`: skip toolchain runs |
| Default (`dropin add default --repo`): every part except the opt-in hooks; on a machine with the opt-in user layer, only what that layer lacks | `-Live`: real headless claude probes |
| `-Full` (`--full`; `-Portable`/`--portable` is the same): every part even with a user layer | `-Keep`: keep and print the sample repos |
| `-Lean` (`--lean`): only the repo set, always; `-Gate` (`--gate`): opt-in Stop gate | `-Banned "[csv]"`: whole-word scan of every file |
| `-DryRun` (or `-WhatIf`), `-Uninstall` (= `dropin remove all`), `-Force` (`--dry-run`, `--uninstall`, `--force`) | |
| exit 0 ok, 1 leak/failure, 2 usage/not a repo/refused, 3 no node | exit 0 no FAIL, 1 any FAIL, 3 no node |

`install-global.ps1` (opt-in user layer) keeps its own flags in its header: `-Plugins`, `-Model`, `-Effort`, `-DryRun`, `-Uninstall`, `-Home`.

The `.ps1` scripts stop with a PowerShell error on an unknown or misspelled flag before doing anything; `install.sh` and `dropin.mjs` exit 2.

## Kill switches and removal
- Gate off in one repo: `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"` (Git Bash), `New-Item -ItemType File -Force (git rev-parse --git-path dev-toolkit-gate-off)` (PowerShell), or env `TK_GATE=off`.
- All hooks off in one repo: `"disableAllHooks": true` in `[repo]/.claude/settings.local.json`, then restart `claude`.
- Full removal, in this order: `git worktree remove [path]` for each worktree `wt-new` made (their hooks point at the main checkout's); then `install.ps1 -Uninstall` (or `install.sh --uninstall`) in each repo; delete `[repo].code-workspace` if `wt-workspace` wrote one, and `.git/dev-toolkit-logs/` if you want the logs gone. Repo-scoped plugins: `claude plugin uninstall [name]@anthropic-plugin-directory --scope local`. If you ever installed the opt-in user layer: `.\install-global.ps1 -Uninstall`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `command not found`, or STALE-PATH in the table | Open a new terminal; re-run `.\bootstrap.cmd -Check`; STALE-PATH that persists: re-run `.\bootstrap.cmd` |
| winget missing | `Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe` or App Installer from the Store |
| Script blocked by execution policy or "downloaded from the internet" | Use `bootstrap.cmd`; or `Get-ChildItem -Recurse \| Unblock-File` in the toolkit folder |
| `python` opens the Microsoft Store | Settings > Apps > Advanced app settings > App execution aliases: off for python.exe/python3.exe; or use `uv run python` |
| WSL or virtualization errors | `wsl --update`; enable VT-x/virtualization in BIOS; reboot |
| bootstrap exits 3 again after the reboot | `wsl --version`: if it prints a version, WSL is in; continue with `.\bootstrap.cmd -Check` |
| selftest P1 FAIL "stale terminal PATH" | Tools were installed after this terminal or VS Code started: open a new terminal (restart VS Code), then re-run |
| Docker Desktop stuck starting | `wsl --shutdown`, then start Docker Desktop again |
| "hook error" on every tool call | Re-run `bash ~/claude-toolkit/install.sh` in that repo, then `.\selftest.ps1 -Quick`; meanwhile `disableAllHooks` in `.claude/settings.local.json` |
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
