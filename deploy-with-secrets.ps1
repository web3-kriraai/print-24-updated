# Deploy print24-pricing-test with GCP Secret Manager

Write-Host "Deploying print24-pricing-test with GCP Secrets..." -ForegroundColor Cyan
Write-Host ""

# Deploy to Cloud Run with secret references
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
    --set-secrets="MONGO_URI_PRICING=mongodb-uri:latest,REDIS_URL=redis-url:latest,JWT_SECRET=jwt-secret:latest" `
    --set-env-vars="NODE_ENV=production" `
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
    Write-Host "  Start-Process '$serviceUrl'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "View logs:" -ForegroundColor Yellow
    Write-Host "  gcloud run services logs read print24-pricing-test --region=asia-south1 --limit=100" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Your secrets are stored securely in GCP Secret Manager" -ForegroundColor Green
    Write-Host "  View: https://console.cloud.google.com/security/secret-manager?project=prints24-web" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  gcloud run services logs read print24-pricing-test --region=asia-south1" -ForegroundColor Gray
}
