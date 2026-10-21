<#
bootstrap-machine.ps1 - idempotent installer for a fresh Windows 11 machine (winget). Installs binaries only; writes no Claude config.
Run it through bootstrap.cmd (no execution-policy flags needed) from a NORMAL, non-admin terminal; approve UAC prompts as they appear.
  .\bootstrap.cmd                    install what is missing, then print the status table and the manual steps left
  .\bootstrap.cmd -Check             report only: status table + manual steps, installs nothing
  .\bootstrap.cmd -WhatIf            dry run (alias -DryRun): prints every install it would perform
  -Minimal                           skip the heavy items (WSL2, Docker Desktop, PostgreSQL 17); overrides -PostgresServer
  -GCloud                            also install the Google Cloud SDK (gcloud)
  -PostgresServer                    full PostgreSQL 17 server instead of the client-only install
  -Lsp                               language servers: pyright, typescript-language-server (npm) and gopls (go install)
  -ExtraNpm "pkg1,pkg2"              extra global npm packages; comma-separated, quoted when passed through cmd
  -PresentationSettings              VS Code font 16, zoom 1, dark theme, Git Bash terminal (node lib\install.mjs vscode-settings)
Exit: 0 every core tool runs, 1 a core tool is missing, 3 reboot required (reboot, then run the same command again).
Log: %TEMP%\bootstrap-<yyyyMMdd-HHmmss>.log. Re-running is safe: present tools are skipped.
#>
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Check, [switch]$Minimal, [switch]$GCloud, [switch]$PostgresServer, [switch]$Lsp, [string[]]$ExtraNpm, [switch]$PresentationSettings, [switch]$DryRun)
if ($DryRun) { $WhatIfPreference = $true }  # same spelling as the installers' -DryRun
# Appx (used by the python Store-stub check) prints ~45 "What if: Set Alias" lines when first imported in a dry run; import it quietly here
if ($WhatIfPreference) { $WhatIfPreference = $false; Import-Module Appx -ErrorAction SilentlyContinue; $WhatIfPreference = $true }
$ErrorActionPreference = 'Continue'
$script:Reboot = $false; $script:Rows = @(); $script:Manual = @(); $script:Stub = $false
$Log = Join-Path $env:TEMP ('bootstrap-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
try { Start-Transcript -Path $Log -WhatIf:$false | Out-Null } catch { Write-Host "transcript unavailable: $($_.Exception.Message)" }
function Say($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "WARN: $m" -ForegroundColor Yellow }
function Finish($code) { try { Stop-Transcript | Out-Null } catch { }; Write-Host "Log: $Log"; exit $code }

$Extra = @()
foreach ($e in $ExtraNpm) { foreach ($p in ($e -split ',')) { $t = $p.Trim().Trim('"', "'", ' '); if ($t) { $Extra += $t } } }
$KnownDirs = @("$HOME\.local\bin", "$HOME\go\bin", "$env:APPDATA\npm", "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin", 'C:\Program Files\PostgreSQL\17\bin')
$Core = @(
  @('Git.Git', 'git', '--version'), @('GitHub.cli', 'gh', '--version'), @('OpenJS.NodeJS.LTS', 'node', '--version'), @('astral-sh.uv', 'uv', '--version'),
  @('GoLang.Go', 'go', 'version'), @('BurntSushi.ripgrep.MSVC', 'rg', '--version'), @('jqlang.jq', 'jq', '--version'), @('sharkdp.fd', 'fd', '--version'),
  @('ezwinports.make', 'make', '--version'), @('Microsoft.VisualStudioCode', 'code', '--version'))
$NpmCore = @(@('typescript', 'tsc'), @('tsx', 'tsx'), @('prettier', 'prettier'))
$NpmLsp = @(@('pyright', 'pyright'), @('typescript-language-server', 'typescript-language-server'))
$UvTools = @('ruff', 'pytest', 'mypy', 'pre-commit')
$Extensions = @('anthropic.claude-code', 'ms-python.python', 'golang.go', 'dbaeumer.vscode-eslint', 'esbenp.prettier-vscode', 'eamodio.gitlens', 'ms-azuretools.vscode-containers')

function Update-SessionPath {
  $all = @([Environment]::GetEnvironmentVariable('Path', 'Machine'), [Environment]::GetEnvironmentVariable('Path', 'User')) + $KnownDirs
  $env:Path = (($all -join ';') -split ';' | Where-Object { $_ } | Select-Object -Unique) -join ';'
}
function Test-Persisted($dir) {
  $saved = ([Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')) -split ';'
  return [bool]($saved | Where-Object { $_ -and ([Environment]::ExpandEnvironmentVariables($_).TrimEnd('\') -ieq $dir.TrimEnd('\')) })
}
function Add-UserPath($dir) {
  if (Test-Persisted $dir) { return }
  if ($PSCmdlet.ShouldProcess('User PATH', "append $dir")) {
    $cur = @([Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ })
    [Environment]::SetEnvironmentVariable('Path', (($cur + $dir) -join ';'), 'User'); Update-SessionPath; Say "User PATH += $dir"
  }
}
function Test-Tool($cmd, $verArgs = '--version') {
  # Runs '<exe> <verArgs>' with a 15 s timeout; returns Ok, the first output line, the resolved path and whether it is the Store python stub.
  $r = [pscustomobject]@{ Ok = $false; Version = ''; Path = $null; Stub = $false }
  $c = Get-Command $cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $c) { return $r }
  $r.Path = $c.Source
  if ($cmd -eq 'python' -and $c.Source -like '*\WindowsApps\*' -and -not (Get-AppxPackage -Name 'PythonSoftwareFoundation.*' -ErrorAction SilentlyContinue)) { $r.Stub = $true; return $r }
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  if ($c.Source -match '\.(cmd|bat)$') { $psi.FileName = $env:ComSpec; $psi.Arguments = '/d /c ""' + $c.Source + '" ' + $verArgs + '"' } else { $psi.FileName = $c.Source; $psi.Arguments = $verArgs }
  $psi.UseShellExecute = $false; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true; $psi.CreateNoWindow = $true
  try {
    $p = [System.Diagnostics.Process]::Start($psi); $o = $p.StandardOutput.ReadToEndAsync(); $e = $p.StandardError.ReadToEndAsync()
    if (-not $p.WaitForExit(15000)) { try { $p.Kill() } catch { }; $r.Version = 'timed out after 15 s'; return $r }
    $line = ($o.Result + "`n" + $e.Result) -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1
    $r.Ok = ($p.ExitCode -eq 0); $r.Version = ("$line" -replace '[^\x20-\x7E]', '').Trim()
  } catch { $r.Version = $_.Exception.Message }
  return $r
}
function Find-Known($cmd) {
  $dirs = $KnownDirs + @("$env:LOCALAPPDATA\Microsoft\WinGet\Links", 'C:\Program Files\Git\cmd', 'C:\Program Files\GitHub CLI', 'C:\Program Files\nodejs', 'C:\Program Files\Go\bin',
    'C:\Program Files\Docker\Docker\resources\bin', 'C:\Program Files\Microsoft VS Code\bin', "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin")
  foreach ($d in $dirs) { foreach ($x in '.exe', '.cmd') { if (Test-Path (Join-Path $d "$cmd$x")) { return $d } } }
  $hit = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Depth 3 -Filter "$cmd.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) { return $hit.DirectoryName }
  return $null
}
function Add-RowRaw($tool, $group, $status, $version, $fix) { $script:Rows += [pscustomobject]@{ Tool = $tool; Group = $group; Status = $status; Version = $version; Fix = $fix } }
function Add-Row($tool, $group, $cmd, $verArgs = '--version', $fix = '', [switch]$Skip) {
  $t = Test-Tool $cmd $verArgs
  if ($t.Ok) {
    $dir = Split-Path $t.Path
    if (Test-Persisted $dir) { Add-RowRaw $tool $group 'OK' $t.Version '' } else { Add-RowRaw $tool $group 'STALE-PATH' $t.Version "runs from $dir, which is not on the saved PATH: re-run bootstrap" }
  } elseif ($t.Stub) { $script:Stub = $true; Add-RowRaw $tool $group 'MISSING' 'Store stub' 'turn off the python App execution aliases, or use uv run python' }
  elseif ($Skip) { Add-RowRaw $tool $group 'SKIPPED' '' $fix }
  else { $k = Find-Known $cmd; if ($k) { Add-RowRaw $tool $group 'STALE-PATH' $t.Version "found in $k`: open a new terminal" } else { Add-RowRaw $tool $group 'MISSING' $t.Version $fix } }
}
function Invoke-Winget($id, $override) {
  $a = @('install', '-e', '--id', $id, '--silent', '--accept-package-agreements', '--accept-source-agreements') + $script:WingetExtra
  if ($override) { $a += @('--override', $override) }
  & winget @a | Out-Host
  $code = '{0:X8}' -f $LASTEXITCODE
  if (@('00000BC2', '00000669', '8A150109', '8A15010A') -contains $code) { $script:Reboot = $true; Warn "$id asks for a reboot to finish" }
  elseif (@('00000000', '8A15002B', '8A150061') -notcontains $code) { Warn "winget install $id exited 0x$code" }
  Update-SessionPath
}
function Install-Winget($id, $cmd, $verArgs = '--version', $override = $null) {
  if ((Test-Tool $cmd $verArgs).Ok) { Say "$cmd present"; return }
  if ($PSCmdlet.ShouldProcess($id, 'winget install')) { Say "winget install $id"; Invoke-Winget $id $override }
}
function Get-NpmRoot { return (& cmd.exe /d /c 'npm root -g 2>nul' | Select-Object -First 1) }
function Get-NpmBin($pkg) {
  $pj = Join-Path "$(Get-NpmRoot)" "$pkg\package.json"
  if (-not (Test-Path $pj)) { return $null }
  try { $j = Get-Content $pj -Raw | ConvertFrom-Json } catch { return $null }
  if ($j.bin -is [string]) { return ($pkg -split '/')[-1] }
  if ($j.bin) { return @($j.bin.PSObject.Properties.Name)[0] }
  return $null
}
function Install-Npm($pkg, $bin) {
  if (-not $bin) { $bin = Get-NpmBin $pkg }
  if ($bin -and (Test-Tool $bin).Ok) { Say "$pkg present"; return }
  if ((-not $bin) -and (Test-Path (Join-Path "$(Get-NpmRoot)" "$pkg\package.json"))) { Say "$pkg present"; return }
  if (-not $PSCmdlet.ShouldProcess($pkg, 'npm install -g')) { return }
  Say "npm install -g $pkg"
  $out = @(& cmd.exe /d /c "npm install -g $pkg 2>&1"); $out | Out-Host
  # npm 11 skips postinstall scripts it has not been told to trust; retry once allowing exactly the packages it named.
  $names = @($out | ForEach-Object { if ("$_" -match 'allow-scripts\s{2,}(@?[^@\s]+)@\S+\s+\(') { $Matches[1] } } | Select-Object -Unique)
  if ($names.Count -gt 0) { Say "retry $pkg with --allow-scripts=$($names -join ',')"; & cmd.exe /d /c "npm install -g $pkg --allow-scripts=$($names -join ',') 2>&1" | Out-Host }
}

# ---- Preflight
$build = [Environment]::OSVersion.Version.Build
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$hasWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
$script:WingetExtra = @()
if ($hasWinget) { $wv = "$(& winget --version)"; if ($wv -match 'v(\d+)\.(\d+)' -and (([int]$Matches[1] -gt 1) -or ([int]$Matches[2] -ge 4))) { $script:WingetExtra = @('--disable-interactivity') } }
if (-not $Check) {
  if ($build -lt 22000) { Warn "Windows build ${build}: this script targets Windows 11 (22000 or later)" }
  if ($admin) { Warn 'running elevated: user-scope tools (uv, npm globals, VS Code) would land in the admin profile; prefer a normal terminal' }
  if ($Minimal -and $PostgresServer) { Warn '-Minimal skips PostgreSQL, so -PostgresServer is ignored' }
  if (-not $hasWinget) {
    Write-Host 'winget not found. Install App Installer, open a new terminal, then re-run:'
    Write-Host '  Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe'
    Write-Host '  or the Store page: https://apps.microsoft.com/detail/9NBLGGH4NNS1'
    Finish 1
  }
  $policy = 'Restricted'
  foreach ($s in 'MachinePolicy', 'UserPolicy', 'CurrentUser', 'LocalMachine') { $v = "$(Get-ExecutionPolicy -Scope $s)"; if ($v -ne 'Undefined') { $policy = $v; break } }
  if ($policy -eq 'Restricted') { Say 'execution policy Restricted: setting CurrentUser to RemoteSigned'; Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force }
  if (-not $WhatIfPreference) { Get-ChildItem $PSScriptRoot -Recurse -File | Unblock-File }
}
Update-SessionPath

# ---- Installs (skipped by -Check)
if (-not $Check) {
  Say 'Core tools'
  foreach ($t in $Core) { Install-Winget $t[0] $t[1] $t[2] }
  if (-not $Minimal) {
    Say 'Heavy tools: WSL2, Docker Desktop, PostgreSQL 17'
    # `wsl --version` succeeds once the WSL package is installed, with or without a distro (`--status` can fail until Docker adds one)
    & wsl.exe --version *> $null
    if ($LASTEXITCODE -ne 0) {
      if ($PSCmdlet.ShouldProcess('WSL2', 'wsl --install --no-distribution (UAC prompt)')) {
        $wp = Start-Process wsl.exe -ArgumentList '--install', '--no-distribution' -Verb RunAs -Wait -PassThru
        if (-not $wp) { Warn 'wsl --install did not start (UAC declined?): re-run bootstrap' }
        else { $script:Reboot = $true; if ($wp.ExitCode -ne 0) { Warn "wsl --install exited $($wp.ExitCode): after the reboot, wsl --version must print a version" } }
      }
    } else { Say 'WSL present' }
    Install-Winget 'Docker.DockerDesktop' 'docker'
    if ($PostgresServer) {
      Install-Winget 'PostgreSQL.PostgreSQL.17' 'psql'
      Warn 'PostgreSQL server installed unattended: set the postgres superuser password (ALTER USER postgres PASSWORD ...) and keep port 5432 local'
    } else {
      # Client-only override flags for the EDB installer are unverified; the psql check below is the real test.
      Install-Winget 'PostgreSQL.PostgreSQL.17' 'psql' '--version' '--mode unattended --unattendedmodeui none --disable-components server,pgAdmin,stackbuilder'
    }
    if (Test-Path 'C:\Program Files\PostgreSQL\17\bin\psql.exe') { Add-UserPath 'C:\Program Files\PostgreSQL\17\bin' }
    if (-not (Test-Tool 'psql').Ok) { Warn 'psql still missing: use the container client instead: docker run --rm -it postgres:17-alpine psql' }
  }
  if ($GCloud) { Install-Winget 'Google.CloudSDK' 'gcloud' }

  Say 'Python via uv'
  if ((Test-Tool 'uv').Ok) {
    if ($PSCmdlet.ShouldProcess('Python 3.12 and 3.14', 'uv python install')) {
      & uv python install 3.12 3.14 | Out-Host
      if (-not (Test-Tool 'python').Ok) {
        & uv python install 3.14 --default | Out-Host
        if ($LASTEXITCODE -ne 0) { Warn 'uv python install --default failed: use uv run python (repos run through uv anyway)' }
        Add-UserPath "$HOME\.local\bin"
      }
    }
  } else { Warn 'uv missing: Python step skipped; open a new terminal and re-run' }

  Say 'Claude Code (native installer)'
  if ((Test-Tool 'claude').Ok) { Say 'claude present' }
  elseif ($PSCmdlet.ShouldProcess('Claude Code', 'irm https://claude.ai/install.ps1 | iex')) {
    & powershell -NoProfile -ExecutionPolicy Bypass -Command 'irm https://claude.ai/install.ps1 | iex' | Out-Host
    Add-UserPath "$HOME\.local\bin"; Update-SessionPath
  }

  Say 'npm globals'
  if ((Test-Tool 'npm').Ok) {
    foreach ($n in $NpmCore) { Install-Npm $n[0] $n[1] }
    if ($Lsp) { foreach ($n in $NpmLsp) { Install-Npm $n[0] $n[1] } }
    foreach ($p in $Extra) { Install-Npm $p $null }
  } else { Warn 'npm missing: npm globals skipped; open a new terminal and re-run' }

  Say 'uv tools'
  if ((Test-Tool 'uv').Ok) {
    $have = (& uv tool list 2>$null) -join "`n"
    foreach ($t in $UvTools) { if ($have -match "(?m)^$([regex]::Escape($t)) v") { Say "$t present"; continue }; if ($PSCmdlet.ShouldProcess($t, 'uv tool install')) { & uv tool install $t | Out-Host } }
    if ($PSCmdlet.ShouldProcess('~/.local/bin', 'uv tool update-shell')) { & uv tool update-shell | Out-Host }
    Add-UserPath "$HOME\.local\bin"
  }
  if ($Lsp) {
    if ((Test-Tool 'gopls' 'version').Ok) { Say 'gopls present' }
    elseif ((Test-Tool 'go' 'version').Ok -and $PSCmdlet.ShouldProcess('gopls', 'go install golang.org/x/tools/gopls@latest')) { & go install golang.org/x/tools/gopls@latest | Out-Host }
    Add-UserPath "$HOME\go\bin"
  }

  Say 'VS Code extensions'
  if ((Test-Tool 'code').Ok) {
    $haveExt = @(& cmd.exe /d /c 'code --list-extensions 2>nul')
    foreach ($x in $Extensions) { if ($haveExt -notcontains $x -and $PSCmdlet.ShouldProcess($x, 'code --install-extension')) { & cmd.exe /d /c "code --install-extension $x 2>&1" | Out-Host } }
  }

  if ((Test-Tool 'git').Ok -and $PSCmdlet.ShouldProcess('git config --global', 'core.longpaths true; init.defaultBranch main if unset')) {
    & git config --global core.longpaths true
    if (-not "$(& git config --global init.defaultBranch)") { & git config --global init.defaultBranch main }
  }
  if ($PresentationSettings) {
    if (-not (Test-Tool 'node').Ok) { Warn 'node missing: -PresentationSettings skipped' }
    elseif ($PSCmdlet.ShouldProcess('VS Code user settings', 'node lib\install.mjs vscode-settings')) { & node "$PSScriptRoot\lib\install.mjs" vscode-settings | Out-Host }
  }
  Update-SessionPath
}

# ---- Status table
foreach ($t in $Core) { Add-Row $t[1] 'core' $t[1] $t[2] "winget install -e --id $($t[0])" }
Add-Row 'claude' 'core' 'claude' '--version' 'irm https://claude.ai/install.ps1 | iex (or re-run bootstrap)'
& wsl.exe --version *> $null; $wslOk = ($LASTEXITCODE -eq 0)
if ($wslOk) { Add-RowRaw 'wsl' 'heavy' 'OK' 'WSL2' '' } elseif ($Minimal) { Add-RowRaw 'wsl' 'heavy' 'SKIPPED' '' '-Minimal' } else { Add-RowRaw 'wsl' 'heavy' 'MISSING' '' 'wsl --install --no-distribution (admin), then reboot' }
Add-Row 'docker' 'heavy' 'docker' '--version' 'winget install -e --id Docker.DockerDesktop' -Skip:$Minimal
Add-Row 'psql' 'heavy' 'psql' '--version' 'docker run --rm -it postgres:17-alpine psql' -Skip:$Minimal
Add-Row 'gcloud' 'optional' 'gcloud' '--version' 'bootstrap -GCloud' -Skip:(-not $GCloud)
Add-Row 'python' 'optional' 'python' '--version' 'uv python install 3.14 --default, or use uv run python'
foreach ($n in $NpmCore) { Add-Row $n[1] 'optional' $n[1] '--version' "npm install -g $($n[0])" }
foreach ($t in $UvTools) { Add-Row $t 'optional' $t '--version' "uv tool install $t" }
foreach ($n in $NpmLsp) { Add-Row $n[1] 'optional' $n[1] '--version' "npm install -g $($n[0])" -Skip:(-not $Lsp) }
Add-Row 'gopls' 'optional' 'gopls' 'version' 'go install golang.org/x/tools/gopls@latest' -Skip:(-not $Lsp)
foreach ($p in $Extra) {
  $b = Get-NpmBin $p
  if ($b) { Add-Row $p 'optional' $b '--version' "npm install -g $p"; $last = $script:Rows[-1]; if ($last.Status -ne 'OK') { $last.Status = 'WARN'; $last.Fix = "installed; '$b --version' failed or timed out" } }
  else { Add-RowRaw $p 'optional' 'MISSING' '' "npm install -g $p" }
}
if ((Test-Tool 'code').Ok) {
  $haveExt = @(& cmd.exe /d /c 'code --list-extensions 2>nul'); $miss = @($Extensions | Where-Object { $haveExt -notcontains $_ })
  if ($miss.Count) { Add-RowRaw 'vscode-ext' 'optional' 'WARN' "$($Extensions.Count - $miss.Count)/$($Extensions.Count)" ('code' + (($miss | ForEach-Object { " --install-extension $_" }) -join '')) } else { Add-RowRaw 'vscode-ext' 'optional' 'OK' "$($Extensions.Count)/$($Extensions.Count)" '' }
}

# ---- Manual steps that apply
if ($script:Reboot) { $script:Manual += 'Reboot now (WSL2 or an installer asked for it), then run the same command again.' }
if (-not $Check) { $script:Manual += 'Open a NEW terminal: PATH changes reach new terminals only. Then: .\bootstrap.cmd -Check' }
if (-not $hasWinget) { $script:Manual += 'Install winget: Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe' }
if ((Test-Tool 'docker').Ok) {
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    $dd = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (-not $Check -and (Test-Path $dd) -and $PSCmdlet.ShouldProcess('Docker Desktop', 'start')) { Start-Process $dd }
    $script:Manual += 'Docker Desktop: start it once, accept the terms, wait for Engine running, then: docker run --rm hello-world'
  }
}
if (-not (Test-Path "$HOME\.claude\.credentials.json")) { $script:Manual += 'Claude login: run claude once and finish the browser login, then /status' }
if ((Test-Tool 'npm').Ok -and ("$(& cmd.exe /d /c 'npm ls -g @anthropic-ai/claude-code --depth=0 2>nul')" -match '@anthropic-ai/claude-code@')) {
  Warn 'an npm copy of Claude Code is installed and can shadow the native one on PATH'
  $script:Manual += 'Remove the npm copy of Claude Code: npm uninstall -g @anthropic-ai/claude-code, then re-run bootstrap (installs the native build)'
}
if ((Test-Tool 'gh').Ok) { & gh auth status *> $null; if ($LASTEXITCODE -ne 0) { $script:Manual += 'GitHub: gh auth login --web (GitHub.com, HTTPS)' } }
if ((Test-Tool 'git').Ok -and (-not "$(& git config --global user.name)" -or -not "$(& git config --global user.email)")) { $script:Manual += 'Git identity: git config --global user.name "<name>"; git config --global user.email "<GitHub email>"' }
if ($script:Stub) { $script:Manual += 'python opens the Store: Settings > Apps > Advanced app settings > App execution aliases, turn off python.exe and python3.exe (or keep using uv run python)' }
$script:Manual += 'Teammates in their own panes (psmux): .\tmux.cmd; see setup\SETUP.md'
$script:Manual += 'Next: .\install-global.ps1 (close all claude sessions first)'

$script:Rows | Format-Table Tool, Group, Status, @{ n = 'Version'; e = { $v = "$($_.Version)"; if ($v.Length -gt 40) { $v.Substring(0, 40) } else { $v } } }, Fix -AutoSize -Wrap | Out-String -Width 220 | Write-Host
Write-Host 'Manual steps remaining:'
$i = 0; foreach ($m in $script:Manual) { $i++; Write-Host "  $i. $m" }
$coreBad = @($script:Rows | Where-Object { $_.Group -eq 'core' -and $_.Status -ne 'OK' }).Count
if ($script:Reboot) { Finish 3 }
if ($coreBad -gt 0) { Write-Host "$coreBad core tool(s) not OK: see the Fix column."; Finish 1 }
Finish 0
