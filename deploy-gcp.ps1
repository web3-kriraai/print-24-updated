# ========================================
# Print24 GCP Deployment Script with SSR
# ========================================
# This script builds the client, prepares the server with SSR,
# creates a Docker image, and deploys to Google Cloud Run

param(
    [string]$ProjectId = "print24-web",
    [string]$ServiceName = "print24-backend",
    [string]$Region = "us-central1",
    [string]$ImageName = "print24-app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Print24 GCP Deployment with SSR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ImageTag = "$Region-docker.pkg.dev/$ProjectId/cloud-run-source-deploy/$ImageName`:latest"
$RootDir = $PSScriptRoot
$ClientDir = Join-Path $RootDir "client"
$ServerDir = Join-Path $RootDir "server"

# Step 1: Build Client
Write-Host "[1/6] Building client application..." -ForegroundColor Yellow
Set-Location $ClientDir
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Client build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Client built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Prepare server with client build
Write-Host "[2/6] Preparing server with client build for SSR..." -ForegroundColor Yellow
$ServerClientDist = Join-Path $ServerDir "client-dist"
if (Test-Path $ServerClientDist) {
    Remove-Item -Recurse -Force $ServerClientDist
}
Copy-Item -Recurse -Path (Join-Path $ClientDir "dist") -Destination $ServerClientDist
Write-Host "✅ Client build copied to server" -ForegroundColor Green
Write-Host ""

# Step 3: Build Docker Image
Write-Host "[3/6] Building Docker image..." -ForegroundColor Yellow
Set-Location $RootDir
docker build -f server/Dockerfile -t $ImageTag .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker image built: $ImageTag" -ForegroundColor Green
Write-Host ""

# Step 4: Push to GCP Container Registry
Write-Host "[4/6] Pushing image to GCP..." -ForegroundColor Yellow
docker push $ImageTag
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    Write-Host "Make sure you're authenticated with: gcloud auth configure-docker" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Image pushed to GCP" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy to Cloud Run
Write-Host "[5/6] Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Redis Configuration" -ForegroundColor Yellow
Write-Host "Your app uses Redis for pricing cache. You have 2 options:" -ForegroundColor White
Write-Host "1. Cloud Memorystore (Managed Redis) - ~$50/month" -ForegroundColor Cyan
Write-Host "2. Upstash Redis (Serverless) - Free tier available" -ForegroundColor Cyan
Write-Host ""
Write-Host "After deployment, configure Redis:" -ForegroundColor Yellow
Write-Host "  gcloud run services update $ServiceName --region=$Region --update-env-vars REDIS_URL=your-redis-url" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to continue with deployment..."

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
    --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Deployed to Cloud Run" -ForegroundColor Green
Write-Host ""

# Step 6: Get Service URL
Write-Host "[6/6] Getting service URL..." -ForegroundColor Yellow
$ServiceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)" --project=$ProjectId
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Next Configuration Steps" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🔴 Configure Redis (REQUIRED for pricing cache):" -ForegroundColor White
Write-Host "   Option A - Upstash Redis (Free Tier):" -ForegroundColor Cyan
Write-Host "     • Sign up at https://upstash.com" -ForegroundColor Gray
Write-Host "     • Create a Redis database" -ForegroundColor Gray
Write-Host "     • Copy the connection URL" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B - Cloud Memorystore:" -ForegroundColor Cyan
Write-Host "     • Create Redis instance in GCP Console" -ForegroundColor Gray
Write-Host "     • Configure VPC connector for Cloud Run" -ForegroundColor Gray
Write-Host ""
Write-Host "   Then update Cloud Run:" -ForegroundColor White
Write-Host "   gcloud run services update $ServiceName --region=$Region --update-env-vars REDIS_URL=your-redis-url" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. 🔴 Configure MongoDB:" -ForegroundColor White
Write-Host "   gcloud run services update $ServiceName --region=$Region --update-env-vars MONGO_URI_PRICING=your-mongodb-uri" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Configure Other Environment Variables:" -ForegroundColor White
Write-Host "   • JWT_SECRET" -ForegroundColor Gray
Write-Host "   • CLOUDINARY_* (for image uploads)" -ForegroundColor Gray
Write-Host "   • GCP_GEOLOCATION_API_KEY" -ForegroundColor Gray
Write-Host "   • FRONTEND_URL=$ServiceUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test the deployment:" -ForegroundColor White
Write-Host "   • Visit: $ServiceUrl" -ForegroundColor Cyan
Write-Host "   • Check logs: gcloud run services logs read $ServiceName --region=$Region" -ForegroundColor Gray
Write-Host ""

# Cleanup
Write-Host "Cleaning up local build artifacts..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $ServerClientDist -ErrorAction SilentlyContinue
Write-Host "✅ Cleanup complete" -ForegroundColor Green

Set-Location $RootDir
