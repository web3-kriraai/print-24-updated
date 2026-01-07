# Print24 Deployment Summary

## ✅ Pre-Deployment Verification Complete

**Date:** 2025-12-31  
**Project:** prints24-web  
**Region:** asia-south1 (Mumbai)  
**Service:** print24-production

---

## Current Status

### ✅ Prerequisites Met
- [x] Google Cloud CLI installed and authenticated
- [x] Docker Desktop installed and running
- [x] Node.js 20+ installed
- [x] GCP Project configured (prints24-web)
- [x] Artifact Registry repository exists (ecommerce-repo)
- [x] All required secrets configured

### ✅ GCP Resources Configured

**Secrets in Secret Manager:**
1. MONGO_TEST_URI - MongoDB connection string
2. JWT_SECRET - JWT authentication secret
3. CLOUDINARY_CLOUD_NAME - Cloudinary cloud name
4. CLOUDINARY_API_KEY - Cloudinary API key
5. CLOUDINARY_API_SECRET - Cloudinary API secret

**Artifact Registry:**
- Repository: ecommerce-repo
- Location: asia-south1
- Format: Docker

---

## Deployment Configuration

### Server Configuration
- **Port:** 8080 (Cloud Run standard)
- **Node Environment:** production
- **Database:** MongoDB Atlas (via MONGO_TEST_URI)
- **Image Storage:** Cloudinary
- **SSR:** Enabled (React Server-Side Rendering)

### Cloud Run Configuration
- **CPU:** 1 vCPU
- **Memory:** 1Gi
- **Concurrency:** 20 requests per instance
- **Timeout:** 60 seconds
- **Min Instances:** 1 (always running, no cold starts)
- **Max Instances:** 4 (auto-scaling)
- **Region:** asia-south1 (Mumbai)

### Architecture
```
┌─────────────────────────────────────────┐
│         Cloud Run Container             │
│  ┌───────────────────────────────────┐  │
│  │   Express Server (Port 8080)      │  │
│  │                                   │  │
│  │  ┌─────────────┐  ┌────────────┐ │  │
│  │  │   API       │  │   Static   │ │  │
│  │  │  /api/*     │  │   Client   │ │  │
│  │  │             │  │   Files    │ │  │
│  │  └─────────────┘  └────────────┘ │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │   SSR (Server-Side          │ │  │
│  │  │   Rendering for React)      │ │  │
│  │  └─────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           │              │
           │              │
    ┌──────▼──────┐  ┌───▼──────┐
    │  MongoDB    │  │Cloudinary│
    │   Atlas     │  │  (CDN)   │
    └─────────────┘  └──────────┘
```

---

## Files Updated

### Configuration Files
1. **setup-gcp.ps1** - Updated MONGO_URI to MONGO_TEST_URI
2. **deploy-gcp.ps1** - Already configured correctly
3. **Dockerfile** - Multi-stage build (client + server)
4. **server/src/server.js** - Uses MONGO_TEST_URI environment variable

### New Files Created
1. **.agent/workflows/deploy-to-gcp.md** - Comprehensive deployment workflow
2. **verify-deployment.ps1** - Pre-deployment verification script

---

## Deployment Steps

### Quick Deployment (Recommended)

```powershell
# 1. Verify everything is ready
.\verify-deployment.ps1

# 2. Deploy to Cloud Run
.\deploy-gcp.ps1
```

### What the Deployment Script Does

1. **Builds the Client**
   - Installs dependencies: `npm install`
   - Creates production build: `npm run build`
   - Output: `client/dist` folder with optimized static files

2. **Builds Docker Image**
   - Multi-stage build process
   - Stage 1: Build React client
   - Stage 2: Setup Node.js server + copy client files
   - Creates optimized production image

3. **Pushes to Artifact Registry**
   - Tags image: `asia-south1-docker.pkg.dev/prints24-web/ecommerce-repo/print24-production:latest`
   - Uploads to GCP Artifact Registry

4. **Deploys to Cloud Run**
   - Creates/updates Cloud Run service
   - Injects secrets as environment variables
   - Configures auto-scaling and resources
   - Enables public access (unauthenticated)

**Expected Duration:** 5-10 minutes

---

## Post-Deployment Verification

### 1. Get Your Application URL

```powershell
gcloud run services describe print24-production --platform managed --region asia-south1 --format 'value(status.url)'
```

### 2. Test Health Endpoint

```powershell
$url = gcloud run services describe print24-production --platform managed --region asia-south1 --format 'value(status.url)'
curl "$url/api/health"
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-31T...",
  "uptime": 123.45
}
```

### 3. Check Application Logs

```powershell
gcloud run logs read --service print24-production --limit 50
```

Look for:
- ✅ MongoDB connected successfully
- ✅ SSR module loaded
- ✅ Client dist folder found
- ✅ Backend Server running on port 8080

### 4. Access the Application

Open your browser and navigate to the Cloud Run URL. You should see:
- Homepage loads correctly
- Products are displayed
- User can sign up/login
- Images load from Cloudinary
- Admin dashboard is accessible

---

## Troubleshooting Guide

### Issue: MongoDB Connection Failed

**Symptoms:**
- Logs show "MongoDB connection error"
- API returns 500 errors

**Solutions:**
1. Verify MongoDB Atlas Network Access allows `0.0.0.0/0`
2. Check connection string format in MONGO_TEST_URI secret
3. Verify username/password are correct
4. Update secret and redeploy:
   ```powershell
   echo "your-new-mongo-uri" | gcloud secrets versions add MONGO_TEST_URI --data-file=-
   .\deploy-gcp.ps1
   ```

### Issue: Cloudinary Upload Fails

**Symptoms:**
- Image uploads don't work
- Product images show broken links

**Solutions:**
1. Verify Cloudinary credentials in GCP secrets
2. Update secrets if needed:
   ```powershell
   echo "your-cloud-name" | gcloud secrets versions add CLOUDINARY_CLOUD_NAME --data-file=-
   echo "your-api-key" | gcloud secrets versions add CLOUDINARY_API_KEY --data-file=-
   echo "your-api-secret" | gcloud secrets versions add CLOUDINARY_API_SECRET --data-file=-
   .\deploy-gcp.ps1
   ```

### Issue: Build Fails

**Symptoms:**
- Client build fails with TypeScript errors
- Docker build fails

**Solutions:**
1. Fix TypeScript errors locally first
2. Test build locally:
   ```powershell
   cd client
   npm install
   npm run build
   cd ..
   ```
3. Clear cache and rebuild:
   ```powershell
   Remove-Item -Recurse -Force client\dist
   Remove-Item -Recurse -Force client\node_modules\.vite
   .\deploy-gcp.ps1
   ```

### Issue: Deployment Fails - Permission Denied

**Symptoms:**
- `gcloud run deploy` fails with permission errors

**Solutions:**
```powershell
# Grant yourself Cloud Run Admin role
gcloud projects add-iam-policy-binding prints24-web --member="user:your-email@gmail.com" --role="roles/run.admin"
```

---

## Monitoring and Maintenance

### View Metrics
1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **Cloud Run** → **print24-production**
3. Click **Metrics** tab

Monitor:
- Request count
- Request latency
- Container CPU utilization
- Container memory utilization
- Error rate

### View Logs
```powershell
# Real-time logs
gcloud run logs tail --service print24-production

# Last 100 logs
gcloud run logs read --service print24-production --limit 100
```

### Update Application
```powershell
# Make your code changes, then redeploy
.\deploy-gcp.ps1
```

### Rollback to Previous Version
```powershell
# List revisions
gcloud run revisions list --service print24-production --region asia-south1

# Rollback to specific revision
gcloud run services update-traffic print24-production --to-revisions REVISION_NAME=100 --region asia-south1
```

---

## Cost Optimization

### Current Configuration Cost Estimate
- **Min Instances:** 1 (always running)
- **Estimated Cost:** ~$15-30/month (depending on traffic)

### To Reduce Costs
```powershell
# Scale down to 0 when not in use (adds cold start delay)
gcloud run services update print24-production --min-instances 0 --region asia-south1
```

**Note:** Setting min-instances to 0 means:
- ✅ Lower costs (only pay when serving requests)
- ❌ Cold starts (2-5 second delay on first request)

---

## Next Steps

1. **Deploy the Application**
   ```powershell
   .\deploy-gcp.ps1
   ```

2. **Test All Features**
   - User registration/login
   - Product browsing
   - Cart functionality
   - Order placement
   - Image uploads
   - Admin dashboard

3. **Set Up Monitoring**
   - Configure uptime checks
   - Set up error alerts
   - Monitor performance metrics

4. **Configure Custom Domain (Optional)**
   - Map your custom domain to Cloud Run
   - Set up SSL certificate (automatic with Cloud Run)

5. **Set Up CI/CD (Optional)**
   - Automate deployments with GitHub Actions
   - Set up staging environment

---

## Support Resources

- **Deployment Workflow:** `.agent/workflows/deploy-to-gcp.md`
- **GCP Cloud Run Docs:** https://cloud.google.com/run/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com
- **Cloudinary Docs:** https://cloudinary.com/documentation

---

## Ready to Deploy?

Run the following command to start deployment:

```powershell
.\deploy-gcp.ps1
```

The deployment will take approximately 5-10 minutes. Watch the terminal for progress updates.

---

**Last Updated:** 2025-12-31  
**Version:** 2.0  
**Status:** ✅ Ready for Deployment
