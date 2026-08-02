# Deploy ESROM BirrBalance on Windows (client local server)
# Usage: .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "ESROM BirrBalance — Docker deploy" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is not installed. Install Docker Desktop first:" -ForegroundColor Red
    Write-Host "https://docs.docker.com/desktop/setup/install/windows-install/"
    exit 1
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not (Test-Path ".env")) {
    Copy-Item ".env.docker.example" ".env"
    Write-Host ""
    Write-Host "Created .env from template. EDIT .env before continuing:" -ForegroundColor Yellow
    Write-Host "  - POSTGRES_PASSWORD"
    Write-Host "  - JWT_SECRET"
    Write-Host "  - AES_SECRET"
    Write-Host "  - CORS_ORIGIN = http://<this-PC-LAN-IP>"
    Write-Host ""
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress
    if ($ip) {
        Write-Host "Suggested LAN IP for this PC: $ip" -ForegroundColor Green
        Write-Host "Users would open: http://${ip}/"
    }
    exit 0
}

Write-Host "Building and starting containers..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host ""
Write-Host "Done. Check status with: docker compose ps" -ForegroundColor Green
Write-Host "View logs with: docker compose logs -f" -ForegroundColor Green

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress
if ($ip) {
    Write-Host ""
    Write-Host "Open from phones/tablets/PCs on the same Wi-Fi:" -ForegroundColor Green
    Write-Host "  http://${ip}/"
}
