---
description: Deploy updated code to Google Cloud Run
---

# Deployment Workflow for Print24

This workflow deploys the updated Print24 application to Google Cloud Run at:
https://print24-production-680867814154.asia-south1.run.app/

## Prerequisites
- Google Cloud SDK (gcloud) installed and authenticated
- Docker installed
- Project ID: print24-production-680867814154
- Region: asia-south1

## Deployment Steps

### 1. Build the client (frontend)
```bash
cd client
npm run build
cd ..
```

### 2. Build and tag the Docker image
```bash
docker build -t gcr.io/print24-production-680867814154/print24:latest -f Dockerfile .
```

### 3. Push the image to Google Container Registry
```bash
docker push gcr.io/print24-production-680867814154/print24:latest
```

### 4. Deploy to Cloud Run
```bash
gcloud run deploy print24 \
  --image gcr.io/print24-production-680867814154/print24:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

## Alternative: One-command deployment using gcloud builds

### Deploy directly from source (recommended)
```bash
gcloud run deploy print24 \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

This command will:
- Build the Docker image using Cloud Build
- Push it to Container Registry
- Deploy to Cloud Run
- All in one step!

## Verification

After deployment, verify the application is running:
1. Visit: https://print24-production-680867814154.asia-south1.run.app/
2. Check health endpoint: https://print24-production-680867814154.asia-south1.run.app/api/health
