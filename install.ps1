<# install.ps1 - per-repo drop-in: the `repo` set (facts, rules, and whatever ~/.claude lacks) through dropin.mjs; git never sees it.
   Usage: & "$HOME\.claude\dev-toolkit\install.ps1" [-Target <repo>] [-Gate] [-Portable] [-DryRun|-WhatIf] [-Uninstall] [-Force]
   -Gate: opt-in Stop gate. -Portable: every part into the repo (no user layer needed). -Uninstall: remove everything this tool placed.
   One part at a time instead: node "$HOME\.claude\dev-toolkit\dropin.mjs" add <part> --repo .   (node dropin.mjs list)
   Unknown or misspelled flags are rejected before anything runs.
   Exit: 0 ok, 1 failed or leaked into git status (or a rejected flag), 2 usage/not a repo/refused, 3 node missing. Logic: dropin.mjs. #>
[CmdletBinding(SupportsShouldProcess)]
param([string]$Target = (Get-Location).Path, [switch]$Gate, [switch]$Portable, [switch]$DryRun, [switch]$Uninstall, [switch]$Force)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'node not found: run bootstrap.cmd first, then open a new terminal'; exit 3 }
$parts = @('add', 'repo')
if ($Gate) { $parts += 'gate' }
if ($Portable) { $parts = @('add', 'all') }
if ($Uninstall) { $parts = @('remove', 'all') }
$flags = @('--repo', $Target)
if ($DryRun -or $WhatIfPreference) { $flags += '--dry-run' }
if ($Force) { $flags += '--force' }
if (-not ($DryRun -or $WhatIfPreference) -and -not $PSCmdlet.ShouldProcess($Target, $(if ($Uninstall) { 'uninstall dev-toolkit drop-in' } else { 'install dev-toolkit drop-in' }))) { exit 0 }  # -Confirm prompts here
& node "$PSScriptRoot\dropin.mjs" @parts @flags
exit $LASTEXITCODE
