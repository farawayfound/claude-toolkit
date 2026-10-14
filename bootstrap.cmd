@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\bootstrap-machine.ps1" %*
exit /b %ERRORLEVEL%
