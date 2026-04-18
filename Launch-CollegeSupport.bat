@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo =====================================================
echo College Support Portal - One-Click Launcher
echo =====================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker CLI was not found.
  echo Install Docker Desktop, then run this file again:
  echo https://www.docker.com/products/docker-desktop/
  goto :end_fail
)

echo [1/5] Checking Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker is not ready yet. Trying to start Docker Desktop...
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  ) else (
    echo [ERROR] Could not find Docker Desktop executable.
    echo Start Docker manually, wait until it says Running, then run this file again.
    goto :end_fail
  )
)

echo [2/5] Waiting for Docker to be ready...
set /a docker_wait=0
:wait_docker
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready
set /a docker_wait+=1
if !docker_wait! geq 120 (
  echo [ERROR] Docker is still not ready after 4 minutes.
  echo Open Docker Desktop and wait for "Engine running", then run this launcher again.
  goto :end_fail
)
timeout /t 2 /nobreak >nul
goto wait_docker

:docker_ready
echo Docker is ready.

if not exist ".env" (
  if exist ".env.example" (
    echo [3/5] Creating .env from .env.example...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo [3/5] Skipping .env creation - .env.example not found.
  )
) else (
  echo [3/5] .env already exists.
)

echo [4/5] Building and starting containers (first time can take a few minutes)...
docker compose up -d --build
if errorlevel 1 (
  echo [ERROR] Docker compose build/start failed.
  echo Run this to inspect logs:
  echo    docker compose logs --tail 200
  goto :end_fail
)

echo [5/5] Waiting for API health...
set /a api_wait=0
:wait_api
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost/api/health -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto api_ready
set /a api_wait+=1
if !api_wait! geq 90 (
  echo API is taking longer than expected.
  echo You can check logs with: docker compose logs -f api
  goto open_browser
)
timeout /t 2 /nobreak >nul
goto wait_api

:api_ready
echo API is healthy.

:open_browser
start "" "http://localhost"

echo.
echo App URL: http://localhost
echo API URL: http://localhost/api/health
echo.
echo To stop everything later:
echo    docker compose down
echo.
goto :end_ok

:end_fail
echo.
pause
exit /b 1

:end_ok
exit /b 0
