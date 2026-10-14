<# install-global.ps1 - user layer: every part into ~/.claude (house rules block, settings merge with permissions and guard hook, skills,
   agents, hooks), the ~/.claude/dev-toolkit mirror and official plugins. Idempotent; never clobbers unrelated keys.
   Close all claude sessions before running (they cache settings and hooks).
   Usage: .\install-global.ps1 [-Plugins core|all|none] [-Model <name>] [-Effort low|medium|high|xhigh|max] [-DryRun|-WhatIf] [-Uninstall] [-Home <dir>]
     -Plugins all also adds security-guidance and the LSP plugins whose binaries are on PATH (bootstrap -Lsp).
     -Home <dir> targets <dir>\.claude instead of your profile (for testing against a temp directory; plugins are skipped there).
     Unknown or misspelled flags are rejected before anything runs.
   Exit: 0 ok, 1 failed, 2 invalid existing JSON (left untouched), 3 node missing. Logic: setup\lib\install.mjs on top of dropin.mjs. #>
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('core', 'all', 'none')][string]$Plugins = 'core', [string]$Model, [ValidateSet('low', 'medium', 'high', 'xhigh', 'max')][string]$Effort,
  [switch]$DryRun, [switch]$Uninstall, [Alias('Home')][string]$HomeDir)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'Node not found: run bootstrap.cmd first, then open a new terminal'; exit 3 }
$extra = @()
if ($Model) { $extra += @('--model', $Model) }
if ($PSBoundParameters.ContainsKey('Effort')) { $extra += @('--effort', $Effort) }
if ($HomeDir) { $extra += @('--home', $HomeDir) }
if ($DryRun -or $WhatIfPreference) { $extra += '--dry-run' }
if ($Uninstall) { $extra += '--uninstall' }
$label = if ($HomeDir) { $HomeDir } else { '~/.claude' }
if (-not ($DryRun -or $WhatIfPreference) -and -not $PSCmdlet.ShouldProcess($label, $(if ($Uninstall) { 'uninstall dev-toolkit' } else { 'install dev-toolkit' }))) { exit 0 }  # -Confirm prompts here
& node "$PSScriptRoot\setup\lib\install.mjs" global --plugins $Plugins @extra
exit $LASTEXITCODE
