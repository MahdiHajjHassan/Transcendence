$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root '.tools\postgres16full\pgsql\bin'

if (!(Test-Path "$bin\pg_isready.exe")) {
  Write-Output 'Portable PostgreSQL binaries not found.'
  exit 1
}

& "$bin\pg_isready.exe" -h localhost -p 5432
