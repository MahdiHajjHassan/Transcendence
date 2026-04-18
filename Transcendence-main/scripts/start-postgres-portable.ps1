$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.tools\postgres16full\pgsql\bin'
$dataDir = Join-Path $root '.tools\postgres-data16'
$logFile = Join-Path $root '.tools\postgres16.log'

if (!(Test-Path "$bin\pg_ctl.exe")) {
  throw "Portable PostgreSQL binaries not found at $bin"
}

try {
  $ready = & "$bin\pg_isready.exe" -h localhost -p 5432
  if ($LASTEXITCODE -eq 0) {
    Write-Output $ready
    Write-Output 'Portable PostgreSQL is already running.'
    exit 0
  }
} catch {
  # continue with start
}

if (!(Test-Path $dataDir)) {
  & "$bin\initdb.exe" -D $dataDir -U postgres -A trust -E UTF8 --no-locale
}

& "$bin\pg_ctl.exe" -D $dataDir -l $logFile -o "-p 5432" start | Out-Host
& "$bin\pg_isready.exe" -h localhost -p 5432 | Out-Host
