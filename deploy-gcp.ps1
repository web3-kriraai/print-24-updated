# Build and Deploy to Google Cloud Run (PowerShell version)
# This script builds the Docker image and deploys it to GCP Cloud Run
# GCP Configuration: asia-south1 (Mumbai), Min 1 instance, Max 4 instances

# Configuration - UPDATE THESE VALUES
$PROJECT_ID = "prints24-web"  # Your existing GCP project ID
$SERVICE_NAME = "print24-production"  # Production service (different from test)
$REGION = "asia-south1"  # Mumbai region
$IMAGE_NAME = "asia-south1-docker.pkg.dev/$PROJECT_ID/ecommerce-repo/$SERVICE_NAME"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Building and Deploying to GCP Cloud Run" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION (Mumbai)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Build the client
Write-Host ""
Write-Host "Step 1: Building client..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install client dependencies" -ForegroundColor Red
    exit 1
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build client" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "  ✓ Client built successfully" -ForegroundColor Green

# Step 2: Configure Docker for Artifact Registry
Write-Host ""
Write-Host "Step 2: Configuring Docker for Artifact Registry..." -ForegroundColor Yellow
gcloud auth configure-docker asia-south1-docker.pkg.dev
Write-Host "  ✓ Docker configured" -ForegroundColor Green

# Step 3: Build Docker image
Write-Host ""
Write-Host "Step 3: Building Docker image..." -ForegroundColor Yellow
docker build -t "${IMAGE_NAME}:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Docker image" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Docker image built" -ForegroundColor Green

# Step 4: Push to Artifact Registry
Write-Host ""
Write-Host "Step 4: Pushing image to Artifact Registry..." -ForegroundColor Yellow
docker push "${IMAGE_NAME}:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push image" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Image pushed successfully" -ForegroundColor Green

# Step 5: Deploy to Cloud Run
Write-Host ""
Write-Host "Step 5: Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "  Configuration:" -ForegroundColor Gray
Write-Host "    - CPU: 1 vCPU" -ForegroundColor Gray
Write-Host "    - Memory: 1Gi" -ForegroundColor Gray
Write-Host "    - Concurrency: 20" -ForegroundColor Gray
Write-Host "    - Timeout: 60s" -ForegroundColor Gray
Write-Host "    - Min Instances: 1" -ForegroundColor Gray
Write-Host "    - Max Instances: 4" -ForegroundColor Gray

gcloud run deploy $SERVICE_NAME `
  --image "${IMAGE_NAME}:latest" `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --cpu 1 `
  --concurrency 20 `
  --timeout 60 `
  --min-instances 1 `
  --max-instances 4 `
  --set-env-vars="NODE_ENV=production" `
  --set-secrets="MONGO_URI=MONGO_URI:latest,JWT_SECRET=JWT_SECRET:latest,CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy to Cloud Run" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is accessible at:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
