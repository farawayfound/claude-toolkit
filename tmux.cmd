@echo off
rem tmux.cmd - forwards to setup\tmux.ps1: teammates in their own panes on Windows with psmux (tmux for Windows, no WSL). Its header lists the flags.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\tmux.ps1" %*
exit /b %ERRORLEVEL%
