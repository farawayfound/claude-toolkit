<# install.ps1 - per-repo drop-in through dropin.mjs: the toolkit into this checkout only; git never sees it.
   Usage: & "$HOME\claude-toolkit\install.ps1" [-Target <repo>] [-Gate] [-Full|-Lean] [-DryRun|-WhatIf] [-Uninstall] [-Force]
   Default (the `default` set): every part except the opt-in hooks, under the repo's .claude\ and CLAUDE.local.md; nothing outside
   the checkout. On a machine with the opt-in ~/.claude user layer it adds only what that layer lacks, so nothing loads twice.
   -Full: every part even then (-Portable is the same, kept for old commands). -Lean: always only the repo set.
   -Gate: opt-in Stop gate. -Uninstall: remove everything this tool placed.
   One part at a time instead: node "$HOME\claude-toolkit\dropin.mjs" add <part> --repo .   (node dropin.mjs list)
   Unknown or misspelled flags are rejected before anything runs.
   Exit: 0 ok, 1 failed or leaked into git status (or a rejected flag), 2 usage/not a repo/refused, 3 node missing. Logic: dropin.mjs. #>
[CmdletBinding(SupportsShouldProcess)]
param([string]$Target = (Get-Location).Path, [switch]$Gate, [switch]$Full, [switch]$Lean, [switch]$Portable, [switch]$DryRun, [switch]$Uninstall, [switch]$Force)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'node not found: run bootstrap.cmd first, then open a new terminal'; exit 3 }
$parts = @('add', 'default')
if ($Full -or $Portable) { $parts = @('add', 'all') }
if ($Lean) { $parts = @('add', 'repo') }
if ($Gate) { $parts += 'gate' }
if ($Uninstall) { $parts = @('remove', 'all') }
$flags = @('--repo', $Target)
if ($DryRun -or $WhatIfPreference) { $flags += '--dry-run' }
if ($Force) { $flags += '--force' }
if (-not ($DryRun -or $WhatIfPreference) -and -not $PSCmdlet.ShouldProcess($Target, $(if ($Uninstall) { 'uninstall dev-toolkit drop-in' } else { 'install dev-toolkit drop-in' }))) { exit 0 }  # -Confirm prompts here
& node "$PSScriptRoot\dropin.mjs" @parts @flags
exit $LASTEXITCODE
