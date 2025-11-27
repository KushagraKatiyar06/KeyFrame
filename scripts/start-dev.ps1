<#
start-dev.ps1

Opens Redis (Docker), backend API, Celery worker, and frontend in separate PowerShell windows
so you can quickly test the full pipeline locally.

Usage (from repository root):
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

Requirements:
- Docker (for Redis) OR you can run Redis separately and skip Docker step
- Python installed and available as `python` (for creating venv and running celery)
- Node.js and npm

#>

Set-StrictMode -Version Latest

# Determine repository root (parent of the scripts directory)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Split-Path -Parent $scriptDir
Write-Host "Repository root detected: $root"

function Ensure-RedisContainer {
    Write-Host "Checking Docker and Redis container..."
    try {
        docker version > $null 2>&1
    }
    catch {
        Write-Host "Docker not found in PATH. Skipping Docker Redis start. Please start Redis manually and set REDIS_URL accordingly." -ForegroundColor Yellow
        return
    }

    $exists = docker ps -a --filter "name=keyframe-redis" --format "{{.Names}}" | Where-Object { $_ -eq 'keyframe-redis' }
    if (-not $exists) {
        Write-Host "Starting Redis container 'keyframe-redis'..."
        docker run --name keyframe-redis -p 6379:6379 -d redis:7 | Out-Null
        Start-Sleep -Seconds 1
    }
    else {
        $running = docker ps --filter "name=keyframe-redis" --format "{{.Names}}" | Where-Object { $_ -eq 'keyframe-redis' }
        if (-not $running) {
            Write-Host "Starting existing Redis container..."
            docker start keyframe-redis | Out-Null
        }
        else {
            Write-Host "Redis container is already running."
        }
    }
    # quick ping
    try {
        docker exec keyframe-redis redis-cli PING
    }
    catch {
        # ignore
    }
}

function Start-Terminal {
    param(
        [string]$Name,
        [string]$Command
    )
    Write-Host "Launching $Name..."
    $escaped = $Command.Replace('"', '""')
    Start-Process -FilePath powershell -ArgumentList "-NoExit", "-Command", "$escaped" -WindowStyle Normal
}

# Ensure Redis (Docker)
Ensure-RedisContainer

# Start backend API on port 3001 (separate window)
$backendCmd = "cd '$root\backend\api'; `$env:PORT='3001'; npm install; node index.js"
Start-Terminal -Name 'Backend (API)' -Command $backendCmd

# Start Celery worker (separate window). Creates venv if missing.
$workerCmd = @"
cd '$root\backend\worker'
if (-not (Test-Path '.venv')) { python -m venv .venv }
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
celery -A app worker --loglevel=info --pool=solo
"@
Start-Terminal -Name 'Worker (Celery)' -Command $workerCmd

# Start frontend (Next.js) in dev mode (separate window)
$frontendCmd = "cd '$root\frontend'; npm install; npm run dev"
Start-Terminal -Name 'Frontend (Next.js)' -Command $frontendCmd

Write-Host "Launched services. Give them a few seconds to start. Then open http://localhost:3000 to use the UI." -ForegroundColor Green
