# ========================================
# Deploy Print24 Pricing Test with GCP Secrets
# ========================================
# This script builds the client, creates a Docker image,
# pushes to GCP, and deploys to print24-pricing-test service

param(
    [string]$ProjectId = "prints24-web",
    [string]$ServiceName = "print24-pricing-test",
    [string]$Region = "asia-south1",
    [string]$ImageName = "print24-app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Print24 Pricing Test Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ImageTag = "$Region-docker.pkg.dev/$ProjectId/cloud-run-source-deploy/$ImageName`:latest"
$RootDir = $PSScriptRoot
$ClientDir = Join-Path $RootDir "client"
$ServerDir = Join-Path $RootDir "server"

# Step 1: Build Client
Write-Host "[1/7] Building client application..." -ForegroundColor Yellow
Set-Location $ClientDir
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Client build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Client built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Prepare server with client build
Write-Host "[2/7] Preparing server with client build for SSR..." -ForegroundColor Yellow
$ServerClientDist = Join-Path $ServerDir "client-dist"
if (Test-Path $ServerClientDist) {
    Remove-Item -Recurse -Force $ServerClientDist
}
Copy-Item -Recurse -Path (Join-Path $ClientDir "dist") -Destination $ServerClientDist
Write-Host "SUCCESS: Client build copied to server" -ForegroundColor Green
Write-Host ""

# Step 3: Build Docker Image
Write-Host "[3/7] Building Docker image with --no-cache..." -ForegroundColor Yellow
Set-Location $RootDir
docker build --no-cache -f server/Dockerfile -t $ImageTag .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Docker image built: $ImageTag" -ForegroundColor Green
Write-Host ""

# Step 4: Push to GCP Container Registry
Write-Host "[4/7] Pushing image to GCP Artifact Registry..." -ForegroundColor Yellow
docker push $ImageTag
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed!" -ForegroundColor Red
    Write-Host "Make sure you're authenticated with: gcloud auth configure-docker $Region-docker.pkg.dev" -ForegroundColor Yellow
    exit 1
}
Write-Host "SUCCESS: Image pushed to GCP" -ForegroundColor Green
Write-Host ""

# Step 5: List Cloud Run Services
Write-Host "[5/7] Listing Cloud Run services..." -ForegroundColor Yellow
gcloud run services list --project=$ProjectId --region=$Region
Write-Host ""

# Step 6: Deploy to Cloud Run with GCP Secrets
Write-Host "[6/7] Deploying to Cloud Run with GCP Secrets..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Using secrets from GCP Secret Manager:" -ForegroundColor Cyan
Write-Host "  - MONGO_URI_PRICING" -ForegroundColor Gray
Write-Host "  - REDIS_URL" -ForegroundColor Gray
Write-Host "  - JWT_SECRET" -ForegroundColor Gray
Write-Host "  - CLOUDINARY_* credentials" -ForegroundColor Gray
Write-Host "  - EMAIL_* credentials" -ForegroundColor Gray
Write-Host "  - GCP_GEOLOCATION_API_KEY" -ForegroundColor Gray
Write-Host ""

gcloud run deploy $ServiceName `
    --image=$ImageTag `
    --platform=managed `
    --region=$Region `
    --allow-unauthenticated `
    --port=8080 `
    --memory=1Gi `
    --cpu=1 `
    --timeout=300 `
    --max-instances=10 `
    --min-instances=0 `
    --set-env-vars="NODE_ENV=production" `
    --update-secrets="MONGO_URI_PRICING=MONGO_URI_PRICING:latest,REDIS_URL=REDIS_URL:latest,JWT_SECRET=JWT_SECRET:latest,CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest,EMAIL_HOST=EMAIL_HOST:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASSWORD=EMAIL_PASSWORD:latest,GCP_GEOLOCATION_API_KEY=GCP_GEOLOCATION_API_KEY:latest,FRONTEND_URL=FRONTEND_URL:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,EXCHANGE_RATE_API_KEY=EXCHANGE_RATE_API_KEY:latest,ENABLE_RECONCILIATION_CRON=ENABLE_RECONCILIATION_CRON:latest" `
    --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Deployed to Cloud Run" -ForegroundColor Green
Write-Host ""

# Step 7: Get Service URL and Verify
Write-Host "[7/7] Getting service URL and verification info..." -ForegroundColor Yellow
$ServiceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)" --project=$ProjectId
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Test the deployment:" -ForegroundColor White
Write-Host "   curl $ServiceUrl/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "2. View logs:" -ForegroundColor White
Write-Host "   gcloud run services logs read $ServiceName --region=$Region --project=$ProjectId" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access the application:" -ForegroundColor White
Write-Host "   $ServiceUrl" -ForegroundColor Cyan
Write-Host ""

# Cleanup
Write-Host "Cleaning up local build artifacts..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $ServerClientDist -ErrorAction SilentlyContinue
Write-Host "SUCCESS: Cleanup complete" -ForegroundColor Green

Set-Location $RootDir
