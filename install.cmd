@echo off
rem install.cmd - forwards to install.mjs with the same arguments (see its header). Same as: node "%USERPROFILE%/claude-toolkit/install.mjs"
where node >nul 2>nul
if errorlevel 1 (
  echo node not found: install Node.js 18 or later, for example with winget install OpenJS.NodeJS.LTS, then open a new terminal
  exit /b 3
)
node "%~dp0install.mjs" %*
exit /b %ERRORLEVEL%
