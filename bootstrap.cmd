@echo off
rem PSModulePath is unset: run from pwsh 7 it carries pwsh's module folders, and Windows PowerShell loading those loses Get-FileHash (the Claude Code installer needs it).
setlocal
set "PSModulePath="
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\bootstrap-machine.ps1" %*
exit /b %ERRORLEVEL%
