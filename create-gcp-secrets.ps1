# Create GCP Secrets for Print24 Pricing

# 1. Enable Secret Manager API (if not already enabled)
gcloud services enable secretmanager.googleapis.com --project=prints24-web

# 2. Create secrets from your .env file
# Read values from .env
$envPath = "server\.env"
$mongoUri = (Get-Content $envPath | Where-Object {$_ -match "^MONGO_URI_PRICING="} | ForEach-Object {$_ -replace "MONGO_URI_PRICING=", ""} | Select-Object -First 1).Trim()
$redisUrl = (Get-Content $envPath | Where-Object {$_ -match "^REDIS_URL="} | ForEach-Object {$_ -replace "REDIS_URL=", ""} | Select-Object -First 1).Trim()
$jwtSecret = (Get-Content $envPath | Where-Object {$_ -match "^JWT_SECRET="} | ForEach-Object {$_ -replace "JWT_SECRET=", ""} | Select-Object -First 1).Trim()
$cloudinaryName = (Get-Content $envPath | Where-Object {$_ -match "^CLOUDINARY_CLOUD_NAME="} | ForEach-Object {$_ -replace "CLOUDINARY_CLOUD_NAME=", ""} | Select-Object -First 1).Trim()
$cloudinaryKey = (Get-Content $envPath | Where-Object {$_ -match "^CLOUDINARY_API_KEY="} | ForEach-Object {$_ -replace "CLOUDINARY_API_KEY=", ""} | Select-Object -First 1).Trim()
$cloudinarySecret = (Get-Content $envPath | Where-Object {$_ -match "^CLOUDINARY_API_SECRET="} | ForEach-Object {$_ -replace "CLOUDINARY_API_SECRET=", ""} | Select-Object -First 1).Trim()

Write-Host "Creating GCP Secrets..." -ForegroundColor Cyan

# Generate JWT secret if not found
if (-not $jwtSecret) {
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
}

# Create MongoDB URI secret
if ($mongoUri) {
    Write-Host "Creating secret: mongodb-uri..." -ForegroundColor Yellow
    echo $mongoUri | gcloud secrets create mongodb-uri --data-file=- --project=prints24-web --replication-policy=automatic 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo $mongoUri | gcloud secrets versions add mongodb-uri --data-file=- --project=prints24-web
    }
    Write-Host "✓ mongodb-uri created/updated" -ForegroundColor Green
}

# Create Redis URL secret
if ($redisUrl) {
    Write-Host "Creating secret: redis-url..." -ForegroundColor Yellow
    echo $redisUrl | gcloud secrets create redis-url --data-file=- --project=prints24-web --replication-policy=automatic 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo $redisUrl | gcloud secrets versions add redis-url --data-file=- --project=prints24-web
    }
    Write-Host "✓ redis-url created/updated" -ForegroundColor Green
}

# Create JWT Secret
if ($jwtSecret) {
    Write-Host "Creating secret: jwt-secret..." -ForegroundColor Yellow
    echo $jwtSecret | gcloud secrets create jwt-secret --data-file=- --project=prints24-web --replication-policy=automatic 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo $jwtSecret | gcloud secrets versions add jwt-secret --data-file=- --project=prints24-web
    }
    Write-Host "✓ jwt-secret created/updated" -ForegroundColor Green
}

# Create Cloudinary secrets if available
if ($cloudinaryName) {
    Write-Host "Creating secret: cloudinary-name..." -ForegroundColor Yellow
    echo $cloudinaryName | gcloud secrets create cloudinary-name --data-file=- --project=prints24-web --replication-policy=automatic 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo $cloudinaryName | gcloud secrets versions add cloudinary-name --data-file=- --project=prints24-web
    }
    Write-Host "✓ cloudinary-name created/updated" -ForegroundColor Green
}

if ($cloudinaryKey) {
    Write-Host "Creating secret: cloudinary-key..." -ForegroundColor Yellow
    echo $cloudinaryKey | gcloud secrets create cloudinary-key --data-file=- --project=prints24-web --replication-policy=automatic 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo $cloudinaryKey | gcloud secrets versions add cloudinary-key --data-file=- --project=prints24-web
    }
    Write-Host "✓ cloudinary-key created/updated" -ForegroundColor Green
}

if ($cloudinarySecret) {
    Write-Host "Creating secret: cloudinary-secret..." -ForegroundColor Yellow
    echo $cloudinarySecret | gcloud secrets create cloudinary-secret --data-file=- --project=prints24-web --replication-policy=automatic 2>$null
    if ($LASTEXITCODE -ne 0) {
        echo $cloudinarySecret | gcloud secrets versions add cloudinary-secret --data-file=- --project=prints24-web
    }
    Write-Host "✓ cloudinary-secret created/updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Secrets created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "View secrets:" -ForegroundColor Yellow
Write-Host "  gcloud secrets list --project=prints24-web" -ForegroundColor Gray
Write-Host ""
Write-Host "Now deploy with secrets:" -ForegroundColor Yellow
Write-Host "  .\deploy-with-secrets.ps1" -ForegroundColor Cyan
