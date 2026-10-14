# Full setup: a fresh Windows 11 laptop from nothing to a verified Claude Code setup

Three layers, each a script at the toolkit root. The parts themselves are documented in [`../README.md`](../README.md).

- **Machine layer**: `bootstrap.cmd` installs the toolchain with winget (binaries only, no Claude config). Logic: `setup/bootstrap-machine.ps1`.
- **User layer**: `install-global.ps1` puts every part into `~/.claude` (`dropin.mjs add all --user`), plus settings defaults, the `~/.claude/dev-toolkit` mirror and official plugins. Logic: `setup/lib/install.mjs`. Without the kit: `node dropin.mjs add takehome --user` (or `live`, `safety`) places a named set and nothing else.
- **Repo layer**: `install.ps1` / `install.sh` run `dropin.mjs add repo` in a checkout: facts, rules, and whatever the user layer lacks; git never sees it.
- `selftest.ps1` proves the wiring end to end (`setup/lib/selftest.mjs`): static checks on the parts, hook contracts, kit and drop-in round trips in sample repos, toolchain smoke, the real `~/.claude`, and optional live probes.

## Quickstart (Windows 11, normal non-admin terminal, in the toolkit folder)
1. `.\bootstrap.cmd` (approve UAC prompts; exit 3 means reboot, then run it again)
2. Open a new terminal, then `.\bootstrap.cmd -Check` until every core row is OK
3. `claude` (browser login once, then `/exit`)
4. `.\install-global.ps1`
5. `.\selftest.ps1`, then `.\selftest.ps1 -Live`
6. Per repo, from its root, in PowerShell: `& "$HOME\.claude\dev-toolkit\install.ps1"`. In a Git Bash terminal: `bash ~/.claude/dev-toolkit/install.sh`; never plain `bash` in PowerShell (it can start WSL), use `& "$env:ProgramFiles\Git\bin\bash.exe" "$HOME/.claude/dev-toolkit/install.sh"`. One part at a time instead: `node ~/.claude/dev-toolkit/dropin.mjs add <part> --repo .`

## What lands where
| Part | Lands in |
|---|---|
| `modules/house-rules/CLAUDE.md` | `~/.claude/CLAUDE.md` marker block (user layer), or the repo's `CLAUDE.local.md` when the user layer lacks it or with `--portable` |
| `modules/permissions/settings.json` | Merged into `~/.claude/settings.json` (or the repo's `.claude/settings.local.json` when the user layer lacks the guard) |
| `modules/guard/` (`guard.mjs`, `guard-rules.mjs`, hook registration) | `~/.claude/hooks/` (or `<repo>/.claude/hooks/tk/`) |
| `modules/gate/` (`gate.mjs`, four hook registrations) | `<repo>/.claude/hooks/tk/` with `-Gate` / `--gate` only; never registered globally by the kit |
| `modules/facts/detect.mjs` | `~/.claude/hooks/` and `<repo>/.claude/hooks/tk/`; the facts block in `<repo>/CLAUDE.local.md`; `Bash(<detected command>:*)` allow rules in `<repo>/.claude/settings.local.json` |
| `modules/skills/*`, `modules/agents/*` | `~/.claude/skills/`, `~/.claude/agents/` (or the repo's `.claude/` with `--portable`); a skill folder brings its reference files and scripts |
| `modules/gate-workflow/gate.js` | `~/.claude/workflows/` (or `<repo>/.claude/workflows/`), plus `enableWorkflows: true` when absent |
| `modules/trail/` (opt-in) | `~/.claude/hooks/trail.mjs` and a UserPromptSubmit registration, only with `dropin add trail` |
| `modules/rules/tk-*.md` | `<repo>/.claude/rules/` (repo-level only) |
| toolkit folder minus `docs/` and `practice/` | Mirror `~/.claude/dev-toolkit/`, used by the per-repo commands |
| bookkeeping | `~/.claude/.dev-toolkit-manifest.json`; per repo `dev-toolkit.json` and an `info/exclude` block in the git dir; hashes for exact removal |

Backups: `settings.json.bak-<yyyyMMdd-HHmmss>` next to `~/.claude/settings.json` (only when it existed); repo backups under `<git dir>/dev-toolkit-backup/`.

## Flags
| bootstrap.cmd | Effect |
|---|---|
| `-Check` | Status table and manual steps only; installs nothing |
| `-WhatIf` (or `-DryRun`) | Dry run: prints every install it would perform |
| `-Minimal` | Skip WSL2, Docker Desktop and PostgreSQL (overrides `-PostgresServer`) |
| `-GCloud` / `-PostgresServer` | Add the Google Cloud SDK / full PostgreSQL 17 server instead of client-only |
| `-Lsp` | pyright, typescript-language-server, gopls |
| `-ExtraNpm "a,b"` | Extra global npm packages (quote the list) |
| `-PresentationSettings` | VS Code font 16, zoom 1, dark theme, Git Bash terminal (`node setup\lib\install.mjs vscode-settings` does the same alone) |
| exit codes | 0 core OK, 1 a core tool missing, 3 reboot required |

| install-global.ps1 | install.ps1 (install.sh) | selftest.ps1 |
|---|---|---|
| `-Plugins core\|all\|none` (default core) | `-Target <dir>` (`--target`), default: current dir | `-Quick`: skip toolchain runs |
| `-Model <name>`, `-Effort low..max` | `-Gate` (`--gate`): opt-in Stop gate | `-Live`: real headless claude probes |
| `-DryRun` (or `-WhatIf`), `-Uninstall` | `-Portable` (`--portable`): every part inside the repo (= `dropin add all`) | `-Keep`: keep and print the sample repos |
| `-Home <dir>`: test against a temp home; plugins skipped | `-DryRun` (or `-WhatIf`), `-Uninstall` (= `dropin remove all`), `-Force` (`--dry-run`, `--uninstall`, `--force`) | `-Banned "<csv>"`: whole-word scan of every file |
| exit 0 ok, 1 failed, 2 invalid JSON, 3 no node | exit 0 ok, 1 leak/failure, 2 usage/not a repo/refused, 3 no node | exit 0 no FAIL, 1 any FAIL, 3 no node |

The `.ps1` scripts stop with a PowerShell error on an unknown or misspelled flag before doing anything; `install.sh` and `dropin.mjs` exit 2.

## Kill switches and removal
- Gate off in one repo: `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"` (Git Bash), `New-Item -ItemType File -Force (git rev-parse --git-path dev-toolkit-gate-off)` (PowerShell), or env `TK_GATE=off`.
- All hooks off: `"disableAllHooks": true` in `~/.claude/settings.json`, then restart `claude`.
- Full removal: `install.ps1 -Uninstall` (or `install.sh --uninstall`) in each repo, then `.\install-global.ps1 -Uninstall` (plugins stay; it prints the uninstall commands and the settings backup path).

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
| "hook error" on every tool call | Re-run `.\install-global.ps1`, then `.\selftest.ps1`; meanwhile `disableAllHooks` |
| Plugin not found | `claude plugin marketplace update anthropic-plugin-directory`, then `.\install-global.ps1` |
| settings.json broken | Restore the newest `~/.claude/settings.json.bak-<ts>`; the installer never overwrites invalid JSON |
| `npm warn allow-scripts` lines | Handled: bootstrap retries once with `--allow-scripts=<names>` |
| Gate keeps asking for tests | Run the test command and show its output, or use the gate off switch above |
| install exits 1 "leaked" | A tracked path collided; read the listed paths, then `--uninstall` |
| A part was edited after install and is "kept" | Intended: the tool never overwrites what it does not own. `--force` on add replaces it; remove by hand otherwise |

## MCP
CLIs first (`gh`, `psql`): they cost no context. When a UI must be driven: `claude mcp add --transport stdio playwright -s local -- npx -y @playwright/mcp@latest`. `setup/mcp.json.example` is reference only; no script installs it.
