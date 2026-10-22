@echo off
rem tmux.cmd - forwards to setup\tmux.ps1: teammates in their own panes on Windows with psmux (tmux for Windows, no WSL). Its header lists the flags.
rem PSModulePath is unset: run from pwsh 7 it carries pwsh's module folders, and Windows PowerShell loading those loses Get-FileHash (the Claude Code installer needs it).
setlocal
set "PSModulePath="
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\tmux.ps1" %*
exit /b %ERRORLEVEL%
