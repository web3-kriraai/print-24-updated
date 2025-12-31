# 🚀 Print24 - Quick Reference

## Application URL
**Production:** https://print24-production-woqgzl36na-el.a.run.app

**Latest Deployment:** 2025-12-31 15:36 IST  
**Revision:** print24-production-00021-clp  
**Status:** ✅ Active and Healthy

## Quick Commands

### Deploy/Update (Quick)
```powershell
.\deploy-gcp.ps1
```

### Fresh Deploy (Clear Cache)
```powershell
# Clear Docker cache
docker system prune -af --volumes

# Clear client cache
Remove-Item -Recurse -Force client\dist
Remove-Item -Recurse -Force client\node_modules\.vite

# Deploy fresh
.\deploy-gcp.ps1
```

### View Logs
```powershell
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=print24-production"
```

### Health Check
```powershell
curl https://print24-production-woqgzl36na-el.a.run.app/api/health
```

### Update Secret
```powershell
echo "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### View Revisions
```powershell
gcloud run revisions list --service print24-production --region asia-south1
```

## Configuration
- **Project:** prints24-web
- **Region:** asia-south1
- **Service:** print24-production
- **Min Instances:** 1
- **Max Instances:** 4

## Documentation
- FRESH_DEPLOYMENT_REPORT.md - Latest deployment report
- DEPLOYMENT_GUIDE.md - Full deployment guide
- DEPLOYMENT_SUMMARY.md - Pre-deployment summary
- DEPLOYMENT_SUCCESS.md - Initial deployment report
- .agent/workflows/deploy-to-gcp.md - Step-by-step workflow
