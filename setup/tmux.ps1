<#
tmux.ps1 - teammates in their own panes on Windows, natively: psmux (tmux for Windows, ConPTY, no WSL), PowerShell 7 for its panes,
the Claude Code CLI, ~/.psmux.conf from setup/tmux/psmux.conf, and teammateMode "auto" in ~/.claude/settings.json (split panes inside
psmux, in-process everywhere else). Verified: Claude Code 2.1.305 + psmux 3.4.0 put each teammate in its own pane (TmuxBackend).
Run it through tmux.cmd from a normal terminal; nothing here needs admin (winget installs psmux and pwsh per user).
  .\tmux.cmd                 install what is missing, then print the status table
  .\tmux.cmd -Check          report only, installs nothing
  .\tmux.cmd -WhatIf         dry run (alias -DryRun)
  .\tmux.cmd -Open <repo>    the split layout: Windows Terminal with a psmux session in <repo> on the left half, VS Code on the right
Exit: 0 ready, 1 a step failed or something is still missing.
Inside a psmux pane the toolkit's own line applies unchanged: node "$HOME/claude-toolkit/install.mjs" --set live, once per repo; then claude.
WSL is not involved: on a machine where WSL2 works, setup/tmux.sh inside it gives the same result with real tmux.
#>
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Check, [switch]$DryRun, [string]$Open)
if ($DryRun) { $WhatIfPreference = $true }
$ErrorActionPreference = 'Continue'
function Say($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "WARN: $m" -ForegroundColor Yellow }
function Update-SessionPath {
  $extra = @("$env:LOCALAPPDATA\Microsoft\WinGet\Links", "$env:USERPROFILE\.local\bin", "$env:LOCALAPPDATA\Microsoft\WindowsApps")
  $all = @([Environment]::GetEnvironmentVariable('Path', 'Machine'), [Environment]::GetEnvironmentVariable('Path', 'User')) + $extra
  $env:Path = (($all -join ';') -split ';' | Where-Object { $_ } | Select-Object -Unique) -join ';'
}
function Have($cmd) { [bool](Get-Command $cmd -CommandType Application -ErrorAction SilentlyContinue) }
function Ver($cmd, $flag = '--version') { try { (& $cmd $flag 2>&1 | Select-Object -First 1) -replace '[^\x20-\x7E]', '' } catch { '' } }
function Install-Winget($id, $cmd, $scope) {
  if (Have $cmd) { Say "$cmd present"; return }
  if (-not (Have 'winget')) { Warn "winget missing: install App Installer from the Store, then re-run"; return }
  if ($PSCmdlet.ShouldProcess($id, 'winget install')) {
    $a = @('install', '-e', '--id', $id, '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'); if ($scope) { $a += @('--scope', $scope) }
    & winget @a | Out-Host; Update-SessionPath
    if (-not (Have $cmd)) { Warn "$cmd still not on PATH: open a new terminal and run .\tmux.cmd -Check" }
  }
}
Update-SessionPath
$conf = Join-Path $PSScriptRoot 'tmux\psmux.conf'; $userConf = "$env:USERPROFILE\.psmux.conf"; $settings = "$env:USERPROFILE\.claude\settings.json"

# ---- -Open: the split layout
function Set-Half($proc, $side, $title) {
  # Moves one top-level window to the left (0) or right (1) half of the primary screen's working area; warns when it cannot find it.
  try {
    Add-Type -AssemblyName System.Windows.Forms
    if (-not ('Tk.TkWin' -as [type])) { Add-Type -Name TkWin -Namespace Tk -MemberDefinition '[DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int cx, bool r); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);' }
    $wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea; $w = [int]($wa.Width / 2); $h = [IntPtr]::Zero
    for ($i = 0; $i -lt 20 -and $h -eq [IntPtr]::Zero; $i++) {
      $p = Get-Process -Name $proc -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and (-not $title -or $_.MainWindowTitle -like "*$title*") } | Select-Object -First 1
      if ($p) { $h = $p.MainWindowHandle } else { Start-Sleep -Milliseconds 500 }
    }
    if ($h -eq [IntPtr]::Zero) { Warn "$proc window not found: snap it yourself (Win+Left or Win+Right)"; return }
    [Tk.TkWin]::ShowWindow($h, 9) | Out-Null   # SW_RESTORE, so a maximized window can move
    [Tk.TkWin]::MoveWindow($h, $wa.X + $side * $w, $wa.Y, $w, $wa.Height, $true) | Out-Null
  } catch { Warn "could not place the $proc window: $($_.Exception.Message); snap it yourself (Win+Left or Win+Right)" }
}
if ($Open) {
  if (-not (Test-Path -LiteralPath $Open -PathType Container)) { Write-Host "folder not found: $Open"; exit 1 }
  if (-not (Have 'psmux')) { Write-Host 'psmux is not installed yet: run .\tmux.cmd first'; exit 1 }
  $win = (Resolve-Path -LiteralPath $Open).Path; $name = (Split-Path $win -Leaf) -replace '[^A-Za-z0-9_-]', '-'
  if (-not $PSCmdlet.ShouldProcess($win, "open Windows Terminal (psmux session $name) on the left and VS Code on the right")) { exit 0 }
  $shell = if (Have 'pwsh') { 'pwsh' } else { 'powershell' }
  # Start-Process joins -ArgumentList with spaces and quotes nothing, so every argument that carries a space is quoted here
  $inner = @($shell, '-NoLogo', '-NoExit', '-Command', "`"psmux new-session -A -s $name`"")
  if (Get-Command wt.exe -ErrorAction SilentlyContinue) { Start-Process wt.exe -ArgumentList (@('-w', 'claude-team', 'new-tab', '--title', "`"psmux $name`"", '-d', "`"$win`"") + $inner) }
  else { Start-Process $shell -WorkingDirectory $win -ArgumentList ($inner | Select-Object -Skip 1) }
  if (Get-Command code -ErrorAction SilentlyContinue) { & cmd.exe /d /c "code -n `"$win`"" | Out-Null } else { Warn 'VS Code (code) is not on PATH: open the folder yourself' }
  Set-Half 'WindowsTerminal' 0 ''; Set-Half 'Code' 1 (Split-Path $win -Leaf)
  Write-Host "Left: psmux session '$name' in $win. Right: VS Code. In the pane: node `"`$HOME/claude-toolkit/install.mjs`" --set live (once per repo), then claude."
  exit 0
}

# ---- install (skipped by -Check)
if (-not $Check) {
  Say 'psmux (tmux for Windows)'; Install-Winget 'marlocarlo.psmux' 'psmux' $null
  Say 'PowerShell 7 (psmux runs its panes and the Claude Code wrapper in it)'; Install-Winget 'Microsoft.PowerShell' 'pwsh' 'user'
  Say 'Claude Code CLI'
  if (Have 'claude') { Say 'claude present' }
  elseif ($PSCmdlet.ShouldProcess('Claude Code', 'irm https://claude.ai/install.ps1 | iex')) { & powershell -NoProfile -ExecutionPolicy Bypass -Command 'irm https://claude.ai/install.ps1 | iex' | Out-Host; Update-SessionPath }
  Say "~/.psmux.conf"
  $pwsh = (Get-Command pwsh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source
  if (-not (Test-Path $userConf)) {
    if ($PSCmdlet.ShouldProcess($userConf, "write from $conf")) {
      $lines = @(); if ($pwsh) { $lines += "set -g default-shell `"$pwsh`"" }; $lines += "source-file `"$($conf -replace '\\', '/')`""
      $lines | Set-Content -Path $userConf -Encoding ascii
    }
  } elseif (-not ((Get-Content $userConf -Raw) -match 'claude-toolkit|psmux\.conf')) {
    if ($PSCmdlet.ShouldProcess($userConf, 'append source-file')) { Add-Content -Path $userConf -Value "`n# claude-toolkit: agent-team panes`nsource-file `"$($conf -replace '\\', '/')`"" -Encoding ascii }
  } else { Say 'psmux.conf already sourced' }
  Say 'teammateMode "auto" in ~/.claude/settings.json (panes inside psmux, in-process elsewhere)'
  if ((Have 'node') -and $PSCmdlet.ShouldProcess($settings, 'set teammateMode auto when unset')) {
    # a script file, not -e: PowerShell 5.1 strips the double quotes out of a native command's inline argument
    $js = Join-Path $env:TEMP 'tk-teammate-mode.js'
    @('const fs = require("fs"), p = require("path"), f = process.argv[2];', 'fs.mkdirSync(p.dirname(f), { recursive: true }); let s = {};',
      'if (fs.existsSync(f)) { try { s = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("settings.json is not valid JSON; left untouched: " + e.message); process.exit(1); } }',
      'if (s.teammateMode) { console.log("teammateMode already " + s.teammateMode); process.exit(0); }',
      'if (fs.existsSync(f)) fs.copyFileSync(f, f + ".bak-tmux");',
      's.teammateMode = "auto"; fs.writeFileSync(f, JSON.stringify(s, null, 2) + "\n"); console.log("teammateMode auto written (backup: settings.json.bak-tmux)");') | Set-Content -Path $js -Encoding ascii
    & node $js $settings | Out-Host; Remove-Item $js -ErrorAction SilentlyContinue
  } elseif (-not (Have 'node')) { Warn 'node missing: add "teammateMode": "auto" to ~/.claude/settings.json yourself' }
}

# ---- status
$rows = @()
function Row($item, $ok, $okText, $fix) { $script:rows += [pscustomobject]@{ Item = $item; Status = $(if ($ok) { 'OK' } else { 'MISSING' }); Fix = $(if ($ok) { $okText } else { $fix }) } }
Row 'psmux' (Have 'psmux') (Ver 'psmux' '-V') 'winget install -e --id marlocarlo.psmux, then open a new terminal'
Row 'pwsh' (Have 'pwsh') (Ver 'pwsh' '-v') 'winget install -e --id Microsoft.PowerShell --scope user'
Row 'claude' (Have 'claude') (Ver 'claude') 'irm https://claude.ai/install.ps1 | iex, then open a new terminal'
Row 'psmux.conf' ((Test-Path $userConf) -and ((Get-Content $userConf -Raw) -match 'claude-toolkit|psmux\.conf')) $userConf "source-file $conf in $userConf"
$tm = if (Test-Path $settings) { try { (Get-Content $settings -Raw | ConvertFrom-Json).teammateMode } catch { $null } } else { $null }
Row 'teammateMode' ([bool]$tm -and $tm -ne 'in-process') "$tm" '"teammateMode": "auto" in ~/.claude/settings.json'
$script:rows += [pscustomobject]@{ Item = 'login'; Status = $(if (Test-Path "$env:USERPROFILE\.claude\.credentials.json") { 'OK' } else { 'TODO' }); Fix = $(if (Test-Path "$env:USERPROFILE\.claude\.credentials.json") { '' } else { 'run claude once and finish the browser login' }) }
$rows | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
$bad = @($rows | Where-Object { $_.Status -eq 'MISSING' }).Count
if ($bad -eq 0) { Write-Host 'Next: .\tmux.cmd -Open <path to your project>   (psmux left, VS Code right); in the pane: node "$HOME/claude-toolkit/install.mjs" --set live, then claude. Teammates open as panes; `tmux list-panes` shows them.' }
exit $(if ($bad) { 1 } else { 0 })
