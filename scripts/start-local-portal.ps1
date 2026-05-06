$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$nodeRoot = Join-Path $root '.tools\node-v24.15.0-win-x64'
$nodeExe = Join-Path $nodeRoot 'node.exe'
$npmCmd = Join-Path $nodeRoot 'npm.cmd'
$npxCmd = Join-Path $nodeRoot 'npx.cmd'
$postgresRoot = Join-Path $root '.tools\postgres16full'
$postgresBin = Join-Path $postgresRoot 'pgsql\bin'
$apiDir = Join-Path $root 'api'
$webDir = Join-Path $root 'web'

function Import-DotEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (!(Test-Path $Path)) {
    return
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    if ($trimmed -match '^(?<name>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$') {
      [System.Environment]::SetEnvironmentVariable($matches.name, $matches.value, 'Process')
    }
  }
}

function Start-DockerDesktop {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe')
  ) | Where-Object { $_ -and (Test-Path $_) }

  $dockerDesktopExe = $candidates | Select-Object -First 1
  if (-not $dockerDesktopExe) {
    return $false
  }

  Start-Process -FilePath $dockerDesktopExe | Out-Null
  return $true
}

if (!(Test-Path $nodeExe) -or !(Test-Path $npmCmd) -or !(Test-Path $npxCmd)) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  $npxCommand = Get-Command npx -ErrorAction SilentlyContinue

  if (-not $nodeCommand -or -not $npmCommand -or -not $npxCommand) {
    throw 'Node.js runtime not found. Install Node.js 22+ or restore the .tools folder.'
  }

  $nodeExe = $nodeCommand.Source
  $npmCmd = $npmCommand.Source
  $npxCmd = $npxCommand.Source
  $nodeRoot = Split-Path -Parent $nodeExe
}

$env:Path = "$nodeRoot;$env:Path"
$env:NPM_CMD = $npmCmd
$env:NPX_CMD = $npxCmd

Import-DotEnv -Path (Join-Path $root '.env')
Import-DotEnv -Path (Join-Path $apiDir '.env')

$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/college_support?schema=public'
$env:CORS_ORIGIN = 'http://localhost:3000'
$env:NEXT_PUBLIC_API_URL = 'http://localhost:4000/api'

if (Test-Path (Join-Path $postgresBin 'pg_ctl.exe')) {
  & (Join-Path $root 'scripts\start-postgres-portable.ps1')
} else {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCommand) {
    throw "Portable PostgreSQL not found at $postgresBin. Install Docker Desktop or restore the .tools\\postgres16full folder."
  }

  & docker info | Out-Null
  if ($LASTEXITCODE -ne 0) {
    $started = Start-DockerDesktop
    if (-not $started) {
      throw 'Docker Desktop is installed but not running, and the launcher could not locate Docker Desktop.exe. Start Docker Desktop or restore the portable PostgreSQL bundle.'
    }

    for ($attempt = 0; $attempt -lt 90; $attempt++) {
      & docker info | Out-Null
      if ($LASTEXITCODE -eq 0) {
        break
      }

      if ($attempt -eq 89) {
        throw 'Docker Desktop did not become ready in time. Start Docker Desktop manually or restore the portable PostgreSQL bundle.'
      }

      cmd /c "timeout /t 2 /nobreak >nul"
    }
  }

  & docker compose -f (Join-Path $root 'docker-compose.yml') up -d db
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to start the PostgreSQL container. Ensure Docker Desktop is running and try again.'
  }

  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    & docker compose -f (Join-Path $root 'docker-compose.yml') exec -T db pg_isready -h localhost -p 5432 -U postgres | Out-Null
    if ($LASTEXITCODE -eq 0) {
      break
    }

    if ($attempt -eq 89) {
      throw 'PostgreSQL did not become ready in time.'
    }

    cmd /c "timeout /t 2 /nobreak >nul"
  }
}

Push-Location $apiDir
try {
  & $npmCmd run prisma:generate
  & $npxCmd prisma db push
  & $npmCmd run seed
}
finally {
  Pop-Location
}

Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d `"$apiDir`" && `"%NPM_CMD%`" run start:dev" -WorkingDirectory $apiDir
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d `"$webDir`" && set `"NEXT_PUBLIC_API_URL=http://localhost:4000/api`" && `"%NPM_CMD%`" run dev" -WorkingDirectory $webDir

Start-Process 'http://localhost:3000'

Write-Host ''
Write-Host 'College Support Portal is starting locally.'
Write-Host 'Web: http://localhost:3000'
Write-Host 'API: http://localhost:4000/api'