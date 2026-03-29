@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

where pwsh >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install.ps1" %*
  set "EXIT_CODE=%ERRORLEVEL%"
  exit /b %EXIT_CODE%
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%

