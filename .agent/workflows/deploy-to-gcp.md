# Print24 Deployment Workflow

This workflow guides you through deploying the Print24 application to Google Cloud Platform (GCP) using Cloud Run.

## Prerequisites Checklist

Before starting deployment, ensure you have:

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Docker Desktop installed and running
- [ ] Node.js 20+ installed
- [ ] MongoDB Atlas database set up with connection string
- [ ] Cloudinary account with API credentials
- [ ] PowerShell (Windows) or Bash (Mac/Linux)

## Phase 1: Initial GCP Setup (One-time only)

### Step 1: Authenticate with Google Cloud

```powershell
gcloud auth login
```

This will open a browser window for authentication.

### Step 2: Set Your Project ID

Edit `setup-gcp.ps1` and update line 5:
```powershell
$PROJECT_ID = "your-actual-project-id"  # Replace with your GCP project ID
```

### Step 3: Run the Setup Script

```powershell
.\setup-gcp.ps1
```

This script will:
- Enable required GCP APIs (Cloud Run, Artifact Registry, Secret Manager)
- Create an Artifact Registry repository
- Create secrets for sensitive data
- Grant Cloud Run access to secrets

**Important:** When prompted, enter your actual values for:
- `MONGO_TEST_URI`: Your MongoDB connection string
- `JWT_SECRET`: A strong random string (e.g., generate with `openssl rand -base64 32`)
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

### Step 4: Verify Secrets Were Created

```powershell
gcloud secrets list
```

You should see all 5 secrets listed.

## Phase 2: Configure MongoDB Atlas

### Step 1: Whitelist Cloud Run IPs

1. Go to MongoDB Atlas dashboard
2. Navigate to **Network Access**
3. Click **Add IP Address**
4. Add `0.0.0.0/0` to allow all IPs (required for Cloud Run)
5. Click **Confirm**

### Step 2: Verify Connection String Format

Your `MONGO_TEST_URI` should look like:
```
mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

**Important:** Special characters in password must be URL-encoded!

## Phase 3: Update Deployment Configuration

### Step 1: Update deploy-gcp.ps1

Edit `deploy-gcp.ps1` and verify these values:

```powershell
$PROJECT_ID = "prints24-web"  # Your GCP project ID
$SERVICE_NAME = "print24-production"  # Your service name
$REGION = "asia-south1"  # Mumbai region (or your preferred region)
```

### Step 2: Verify Dockerfile

The `Dockerfile` should already be configured correctly. It uses a multi-stage build:
- Stage 1: Builds the React client
- Stage 2: Sets up the Node.js server and copies client build files

## Phase 4: Build and Deploy

### Step 1: Clean Previous Builds (Optional)

```powershell
# Remove client build artifacts
Remove-Item -Recurse -Force client\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force client\node_modules\.vite -ErrorAction SilentlyContinue
```

### Step 2: Run the Deployment Script

```powershell
.\deploy-gcp.ps1
```

This script will:
1. Install client dependencies
2. Build the client (creates `client/dist`)
3. Configure Docker for Artifact Registry
4. Build Docker image (no cache for clean build)
5. Push image to Artifact Registry
6. Deploy to Cloud Run with proper configuration

**Expected Duration:** 5-10 minutes depending on your internet speed.

### Step 3: Monitor Deployment

Watch the terminal output for:
- ✅ Green checkmarks indicate success
- ❌ Red X marks indicate errors
- Yellow warnings can usually be ignored

## Phase 5: Verify Deployment

### Step 1: Get Your Application URL

```powershell
gcloud run services describe print24-production --platform managed --region asia-south1 --format 'value(status.url)'
```

This will output your app URL, something like:
```
https://print24-production-xxxxx-an.a.run.app
```

### Step 2: Test the Health Endpoint

```powershell
curl https://your-app-url/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-31T...",
  "uptime": 123.45
}
```

### Step 3: Access the Application

Open your browser and navigate to your Cloud Run URL. You should see the Print24 application.

### Step 4: Check Logs

```powershell
gcloud run logs read --service print24-production --limit 50
```

Look for:
- ✅ MongoDB connected successfully
- ✅ SSR module loaded
- ✅ Client dist folder found

## Phase 6: Troubleshooting

### Issue: Build Fails

**Symptom:** Client build fails with errors

**Solution:**
```powershell
cd client
npm install
npm run build
cd ..
```

Check for TypeScript errors and fix them before deploying.

### Issue: Docker Build Fails

**Symptom:** Docker build fails during image creation

**Solution:**
1. Ensure Docker Desktop is running
2. Check Docker has enough resources (4GB+ RAM)
3. Try building without cache:
   ```powershell
   docker build --no-cache -t test-build .
   ```

### Issue: Deployment Fails - Permission Denied

**Symptom:** `gcloud run deploy` fails with permission errors

**Solution:**
```powershell
# Grant yourself Cloud Run Admin role
gcloud projects add-iam-policy-binding your-project-id \
  --member="user:your-email@gmail.com" \
  --role="roles/run.admin"
```

### Issue: App Returns 500 Error

**Symptom:** Application loads but returns 500 errors

**Solution:**
1. Check logs:
   ```powershell
   gcloud run logs read --service print24-production --limit 100
   ```

2. Common causes:
   - MongoDB connection failed (check MONGO_TEST_URI secret)
   - Missing secrets (verify all 5 secrets exist)
   - Cloudinary authentication failed (check credentials)

### Issue: MongoDB Connection Failed

**Symptom:** Logs show "MongoDB connection error"

**Solution:**
1. Verify MongoDB Atlas Network Access allows `0.0.0.0/0`
2. Check connection string format
3. Verify username/password are correct
4. Update the secret:
   ```powershell
   echo "your-new-mongo-uri" | gcloud secrets versions add MONGO_TEST_URI --data-file=-
   ```
5. Redeploy:
   ```powershell
   .\deploy-gcp.ps1
   ```

### Issue: Cloudinary Upload Fails

**Symptom:** Image uploads don't work

**Solution:**
1. Verify Cloudinary credentials in GCP secrets
2. Update secrets if needed:
   ```powershell
   echo "your-cloud-name" | gcloud secrets versions add CLOUDINARY_CLOUD_NAME --data-file=-
   echo "your-api-key" | gcloud secrets versions add CLOUDINARY_API_KEY --data-file=-
   echo "your-api-secret" | gcloud secrets versions add CLOUDINARY_API_SECRET --data-file=-
   ```
3. Redeploy

## Phase 7: Updating the Application

When you make code changes and want to redeploy:

### Quick Update (Code Changes Only)

```powershell
.\deploy-gcp.ps1
```

This rebuilds and redeploys everything.

### Update Secrets Only

```powershell
# Update a secret
echo "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy to pick up new secret
gcloud run deploy print24-production \
  --image asia-south1-docker.pkg.dev/prints24-web/ecommerce-repo/print24-production:latest \
  --region asia-south1
```

### Rollback to Previous Version

```powershell
# List revisions
gcloud run revisions list --service print24-production --region asia-south1

# Rollback to specific revision
gcloud run services update-traffic print24-production \
  --to-revisions REVISION_NAME=100 \
  --region asia-south1
```

## Phase 8: Monitoring and Maintenance

### View Metrics

1. Go to GCP Console
2. Navigate to **Cloud Run** → **print24-production**
3. Click **Metrics** tab

Monitor:
- Request count
- Request latency
- Container CPU utilization
- Container memory utilization

### Set Up Alerts

1. Go to **Cloud Monitoring** → **Alerting**
2. Create alert policies for:
   - High error rate (>5%)
   - High latency (>2s)
   - Container crashes

### Cost Optimization

Current configuration:
- Min instances: 1 (always running)
- Max instances: 4
- Memory: 1Gi
- CPU: 1 vCPU

To reduce costs:
```powershell
# Scale down to 0 when not in use
gcloud run services update print24-production \
  --min-instances 0 \
  --region asia-south1
```

**Note:** Setting min-instances to 0 means cold starts (2-5s delay on first request).

## Quick Reference Commands

```powershell
# View service details
gcloud run services describe print24-production --region asia-south1

# View logs
gcloud run logs read --service print24-production --limit 50

# List secrets
gcloud secrets list

# Update secret
echo "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy
.\deploy-gcp.ps1

# Delete service (careful!)
gcloud run services delete print24-production --region asia-south1
```

## Success Checklist

After deployment, verify:

- [ ] Application URL is accessible
- [ ] Health endpoint returns 200 OK
- [ ] Homepage loads correctly
- [ ] User can sign up/login
- [ ] Products are displayed
- [ ] Image uploads work
- [ ] Orders can be created
- [ ] Admin dashboard is accessible
- [ ] No errors in Cloud Run logs

## Support Resources

- **GCP Cloud Run Docs:** https://cloud.google.com/run/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com
- **Cloudinary Docs:** https://cloudinary.com/documentation
- **Project Issues:** Check the deployment logs first

---

**Last Updated:** 2025-12-31
**Deployment Guide Version:** 2.0
