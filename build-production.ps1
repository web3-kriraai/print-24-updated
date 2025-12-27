# Build Script for Production Deployment
# This builds both client and server for deployment

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Building Print24 for Production" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Clean previous builds
Write-Host "`nStep 1: Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "client\dist") {
    Remove-Item -Recurse -Force "client\dist"
    Write-Host "  ✓ Cleaned client/dist" -ForegroundColor Green
}

# Step 2: Install client dependencies
Write-Host "`nStep 2: Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install client dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Client dependencies installed" -ForegroundColor Green

# Step 3: Build client
Write-Host "`nStep 3: Building client..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to build client" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Client built successfully" -ForegroundColor Green
Set-Location ..

# Step 4: Install server dependencies
Write-Host "`nStep 4: Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install server dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Server dependencies installed" -ForegroundColor Green
Set-Location ..

# Step 5: Verify build
Write-Host "`nStep 5: Verifying build..." -ForegroundColor Yellow
if (Test-Path "client\dist\index.html") {
    Write-Host "  ✓ client/dist/index.html exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ client/dist/index.html not found" -ForegroundColor Red
    exit 1
}

if (Test-Path "client\dist\client.js") {
    Write-Host "  ✓ client/dist/client.js exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ client/dist/client.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Test locally: cd server && npm start" -ForegroundColor White
Write-Host "  2. Deploy to GCP: .\deploy-gcp.ps1" -ForegroundColor White
Write-Host "  3. Or build Docker: docker build -t print24-app ." -ForegroundColor White
