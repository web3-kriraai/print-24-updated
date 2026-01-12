# Deploy print24-pricing-test with environment variables from .env file

Write-Host "Reading secrets from .env file..." -ForegroundColor Yellow

# Read .env file
$envFile = Get-Content "server\.env" -Raw
$envVars = @{}

# Parse .env file
$envFile -split "`n" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^"|"$', ''
            $value = $value -replace "^'|'$", ''
            $envVars[$key] = $value
        }
    }
}

# Get required values
$mongoUri = $envVars["MONGO_URI_PRICING"]
$redisUrl = $envVars["REDIS_URL"]
$jwtSecret = $envVars["JWT_SECRET"]
$cloudinaryName = $envVars["CLOUDINARY_CLOUD_NAME"]
$cloudinaryKey = $envVars["CLOUDINARY_API_KEY"]
$cloudinarySecret = $envVars["CLOUDINARY_API_SECRET"]

Write-Host ""
Write-Host "✓ Found MONGO_URI_PRICING: $(if($mongoUri){'Yes'}else{'No'})" -ForegroundColor $(if($mongoUri){'Green'}else{'Red'})
Write-Host "✓ Found REDIS_URL: $(if($redisUrl){'Yes'}else{'No'})" -ForegroundColor $(if($redisUrl){'Green'}else{'Red'})
Write-Host "✓ Found JWT_SECRET: $(if($jwtSecret){'Yes'}else{'No'})" -ForegroundColor $(if($jwtSecret){'Green'}else{'Red'})
Write-Host ""

if (-not $mongoUri) {
    Write-Host "❌ MONGO_URI_PRICING not found in .env file!" -ForegroundColor Red
    exit 1
}

if (-not $redisUrl) {
    Write-Host "❌ REDIS_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

if (-not $jwtSecret) {
    # Generate a random JWT secret if not found
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    Write-Host "⚠️  JWT_SECRET not found, generated random one" -ForegroundColor Yellow
}

Write-Host "Deploying print24-pricing-test to Cloud Run..." -ForegroundColor Cyan

# Build environment variables string
$envVarString = "MONGO_URI_PRICING=$mongoUri,REDIS_URL=$redisUrl,JWT_SECRET=$jwtSecret,NODE_ENV=production"

if ($cloudinaryName) {
    $envVarString += ",CLOUDINARY_CLOUD_NAME=$cloudinaryName"
}
if ($cloudinaryKey) {
    $envVarString += ",CLOUDINARY_API_KEY=$cloudinaryKey"
}
if ($cloudinarySecret) {
    $envVarString += ",CLOUDINARY_API_SECRET=$cloudinarySecret"
}

# Deploy to Cloud Run
gcloud run deploy print24-pricing-test `
    --image=asia-south1-docker.pkg.dev/prints24-web/cloud-run-source-deploy/print24-app:latest `
    --region=asia-south1 `
    --platform=managed `
    --allow-unauthenticated `
    --port=8080 `
    --memory=1Gi `
    --cpu=1 `
    --timeout=300 `
    --min-instances=0 `
    --max-instances=10 `
    --set-env-vars="$envVarString" `
    --project=prints24-web

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    # Get service URL
    $serviceUrl = gcloud run services describe print24-pricing-test --region=asia-south1 --format="value(status.url)" --project=prints24-web
    
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Test your deployment:" -ForegroundColor Yellow
    Write-Host "  curl $serviceUrl/api/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "View logs:" -ForegroundColor Yellow
    Write-Host "  gcloud run services logs read print24-pricing-test --region=asia-south1" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  gcloud run services logs read print24-pricing-test --region=asia-south1" -ForegroundColor Gray
}
