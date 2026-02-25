$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.tools\postgres16full\pgsql\bin'
$dataDir = Join-Path $root '.tools\postgres-data16'

if (Test-Path "$bin\pg_ctl.exe" -and (Test-Path $dataDir)) {
  & "$bin\pg_ctl.exe" -D $dataDir stop -m fast | Out-Host
} else {
  Write-Output 'Portable PostgreSQL not initialized.'
}
