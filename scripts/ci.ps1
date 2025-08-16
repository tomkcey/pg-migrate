#!/usr/bin/env pwsh

# CI Script with PostgreSQL Health Check
# This script runs the full CI pipeline with proper health checking

# Set up cleanup trap for unexpected exits
trap {
    Write-Host "🧹 Emergency cleanup..." -ForegroundColor Yellow
    docker compose down 2>$null
    exit 1
}

Write-Host "🚀 Starting CI Pipeline..." -ForegroundColor Green

# Step 1: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 2: Format code
Write-Host "✨ Formatting code..." -ForegroundColor Yellow
npm run fmt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Code formatting failed" -ForegroundColor Red
    exit 1
}

# Step 3: Build application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Start Docker services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    exit 1
}

# Step 5: Health check for PostgreSQL
Write-Host "🏥 Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$isReady = $false

while ($attempt -lt $maxAttempts -and -not $isReady) {
    $attempt++
    Write-Host "   Attempt $attempt/$maxAttempts..." -ForegroundColor Cyan
    
    # Try to connect to PostgreSQL using pg_isready
    docker compose exec -T postgresql pg_isready -U test -d test 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $isReady = $true
        Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
    }
    else {
        Start-Sleep -Seconds 2
    }
}

if (-not $isReady) {
    Write-Host "❌ PostgreSQL failed to become ready within timeout" -ForegroundColor Red
    Write-Host "🧹 Cleaning up Docker services..." -ForegroundColor Yellow
    docker compose down
    exit 1
}

# Step 6: Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm run test
$testExitCode = $LASTEXITCODE

# Step 7: Cleanup Docker services
Write-Host "🧹 Cleaning up Docker services..." -ForegroundColor Yellow
docker compose down

# Step 8: Report results
if ($testExitCode -eq 0) {
    Write-Host "🎉 CI Pipeline completed successfully!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}
