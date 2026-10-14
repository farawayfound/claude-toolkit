<# selftest.ps1 - the "is everything wired" check: static checks, hook contracts, sample-repo drop-ins, toolchain smoke.
   Usage: .\selftest.ps1 [-Quick] [-Live] [-Keep] [-Banned "<comma-separated terms>"]
     -Quick skips the toolchain runs; -Live adds real headless claude probes (costs a few cents);
     -Keep keeps the temp sample repos and prints their paths (fixture A is the one to try the workflow on); -Banned scans every toolkit file.
   Exit: 0 when nothing FAILs, 1 otherwise (or a rejected flag), 3 node missing. Logic: setup\lib\selftest.mjs. #>
[CmdletBinding()]
param([switch]$Quick, [switch]$Live, [switch]$Keep, [string]$Banned)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'node not found: run bootstrap.cmd first, then open a new terminal'; exit 3 }
$flags = @()
if ($Quick) { $flags += '--quick' }
if ($Live) { $flags += '--live' }
if ($Keep) { $flags += '--keep' }
if ($Banned) { $flags += @('--banned', $Banned) }
& node "$PSScriptRoot\setup\lib\selftest.mjs" @flags
exit $LASTEXITCODE
