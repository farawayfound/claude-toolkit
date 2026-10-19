<# install.ps1 - per-repo drop-in through dropin.mjs: one set of the toolkit into this checkout only; git never sees it.
   Usage, in PowerShell: ~\claude-toolkit\install.cmd [-Set full|live|takehome|unbound] [-Target <repo>] [-Gate] [-DryRun|-WhatIf] [-Force] [-Uninstall]
   (install.cmd runs this file with the execution policy bypassed; `& ~\claude-toolkit\install.ps1` is the same where scripts are allowed.)
   Without -Set it asks which set to place (Enter = full); when input is redirected it places full. The sets are described in the header
   of install.sh and by `node dropin.mjs list`; any other set or part name works too (-Set repo, -Set safety). Re-running with another set only adds.
   -Gate adds the opt-in Stop gate. -Uninstall removes everything this tool placed. Unknown or misspelled flags are rejected before anything runs.
   Exit: 0 ok, 1 failed or leaked into git status (or a rejected flag), 2 usage/not a repo/refused, 3 node missing. Logic: dropin.mjs. #>
[CmdletBinding(SupportsShouldProcess)]
param([string]$Set, [string]$Target = (Get-Location).Path, [switch]$Gate, [switch]$DryRun, [switch]$Force, [switch]$Uninstall)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'node not found: run bootstrap.cmd first, then open a new terminal'; exit 3 }
$dry = $DryRun -or $WhatIfPreference
if (-not $Set -and -not $Uninstall) {
  $Set = 'full'
  if (-not [Console]::IsInputRedirected) {
    Write-Host 'Which set?'
    Write-Host '  1  full      every part except the opt-in Stop gate'
    Write-Host '  2  live      60-90 minute session on someone else''s code: recon, scope, decide, repro-fix, check, pr-brief, team; three agents; prompt log'
    Write-Host '  3  takehome  timed challenge, 90 minutes to 3 hours: takehome-init, scope, decide, check, break, deslop, tighten-docs, ship, team; four agents; prompt log'
    Write-Host '  4  unbound   no time limit: everything general-purpose, including parallel and the /gate review'
    $answer = (Read-Host 'Choose [1-4, Enter = 1]').Trim()
    switch -Regex ($answer) {
      '^(1|full)?$' { $Set = 'full' }
      '^(2|live)$' { $Set = 'live' }
      '^(3|takehome)$' { $Set = 'takehome' }
      '^(4|unbound)$' { $Set = 'unbound' }
      default { Write-Host "unknown set: $answer (1-4, or a name from node dropin.mjs list)"; exit 2 }
    }
  }
}
$parts = if ($Uninstall) { @('remove', 'all') } else { @('add', $Set) }
if ($Gate -and -not $Uninstall) { $parts += 'gate' }
$flags = @('--repo', $Target)
if ($dry) { $flags += '--dry-run' }
if ($Force) { $flags += '--force' }
$what = if ($Uninstall) { 'uninstall dev-toolkit drop-in' } else { "install dev-toolkit set $Set" }
if (-not $dry -and -not $PSCmdlet.ShouldProcess($Target, $what)) { exit 0 }  # -Confirm prompts here
& node "$PSScriptRoot\dropin.mjs" @parts @flags
exit $LASTEXITCODE
