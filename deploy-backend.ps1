# Deploy Backend Only to Google Cloud Run (PowerShell)
# For use when frontend is hosted separately on Cloud Storage

$PROJECT_ID = "prints24-web"
$SERVICE_NAME = "print24-backend"
$REGION = "asia-south1"
$IMAGE_NAME = "asia-south1-docker.pkg.dev/$PROJECT_ID/ecommerce-repo/$SERVICE_NAME"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying Backend to GCP Cloud Run" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION (Mumbai)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Configure Docker for Artifact Registry
Write-Host ""
Write-Host "Step 1: Configuring Docker for Artifact Registry..." -ForegroundColor Yellow
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
Write-Host "  ✓ Docker configured" -ForegroundColor Green

# Step 2: Build Docker image (backend only - no client build needed)
Write-Host ""
Write-Host "Step 2: Building Docker image (backend only)..." -ForegroundColor Yellow
docker build -t "${IMAGE_NAME}:latest" -f Dockerfile.backend . --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Docker image" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Docker image built" -ForegroundColor Green

# Step 3: Push to Artifact Registry
Write-Host ""
Write-Host "Step 3: Pushing image to Artifact Registry..." -ForegroundColor Yellow
docker push "${IMAGE_NAME}:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push image" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Image pushed successfully" -ForegroundColor Green

# Step 4: Deploy to Cloud Run
Write-Host ""
Write-Host "Step 4: Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $SERVICE_NAME `
  --image "${IMAGE_NAME}:latest" `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --cpu 1 `
  --concurrency 80 `
  --timeout 60 `
  --min-instances 0 `
  --max-instances 4 `
  --set-env-vars="NODE_ENV=production" `
  --set-secrets="MONGO_URI=MONGO_URI:latest,JWT_SECRET=JWT_SECRET:latest,CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy to Cloud Run" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Backend Deployment complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend API is accessible at:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
