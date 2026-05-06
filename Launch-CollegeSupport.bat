@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo =====================================================
echo College Support Portal - One-Click Launcher
echo =====================================================
echo.

echo [1/2] Starting the local stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\start-local-portal.ps1"
if errorlevel 1 (
  echo [ERROR] Local startup failed.
  goto :end_fail
)

echo [2/2] Done.
echo App URL: http://localhost:3000
echo API URL: http://localhost:4000/api
echo.
goto :end_ok

:end_fail
echo.
pause
exit /b 1

:end_ok
exit /b 0
