# 🚀 Deployment Checklist - Print24 to GCP

Use this checklist to ensure smooth deployment to Google Cloud Platform.

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. GCP Account Setup
- [ ] GCP account created at https://console.cloud.google.com
- [ ] Billing account created and linked
- [ ] Billing alerts configured
- [ ] Project created (note the Project ID)

### 2. Local Tools Installed
- [ ] `gcloud` CLI installed
  - Download: https://cloud.google.com/sdk/docs/install
  - Test: `gcloud --version`
- [ ] Docker Desktop installed and running
  - Download: https://www.docker.com/products/docker-desktop
  - Test: `docker --version`
- [ ] Node.js 20+ installed
  - Test: `node --version`
- [ ] PowerShell (Windows) or Bash (Mac/Linux)

### 3. Database Setup (MongoDB Atlas)
- [ ] MongoDB Atlas account created
- [ ] Cluster created (preferably in Mumbai region)
- [ ] Database user created with password
- [ ] Network Access set to `0.0.0.0/0` (allow all IPs)
- [ ] Connection string copied and saved

### 4. Third-Party Services
- [ ] Cloudinary account created
- [ ] Cloudinary credentials obtained:
  - Cloud Name
  - API Key
  - API Secret
- [ ] Email SMTP credentials (optional):
  - Host, Port, Username, Password

### 5. Local Environment Files
- [ ] `client/.env` created (copy from `.env.example`)
- [ ] `server/.env` created (copy from `.env.example`)
- [ ] All secrets filled in `.env` files
- [ ] Test local development works

---

## 📝 CONFIGURATION CHECKLIST

### 1. Update Project Configuration
- [ ] Edit `setup-gcp.ps1` - Set `$PROJECT_ID`
- [ ] Edit `deploy-gcp.ps1` - Set `$PROJECT_ID`
- [ ] Verify region is `asia-south1` in both files
- [ ] Verify service name is `ecommerce-monolith`

### 2. Verify Environment Variables
Create a checklist of all secrets you need:

**Required Secrets:**
- [ ] `MONGO_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - Random strong string (generate one)
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`

**Optional Secrets:**
- [ ] `EMAIL_HOST`
- [ ] `EMAIL_PORT`
- [ ] `EMAIL_USER`
- [ ] `EMAIL_PASSWORD`

---

## 🔧 FIRST-TIME SETUP CHECKLIST

### 1. Authenticate with GCP
```powershell
# Login to GCP
gcloud auth login

# Set your project
gcloud config set project YOUR-PROJECT-ID

# Verify
gcloud config get-value project
```
- [ ] Logged in successfully
- [ ] Project set correctly

### 2. Run GCP Setup Script
```powershell
.\setup-gcp.ps1
```

This script will:
- [ ] Enable required APIs
- [ ] Create Artifact Registry repository
- [ ] Create Secret Manager secrets
- [ ] Grant permissions to Cloud Run

**During script execution, you'll be prompted for:**
- [ ] MongoDB URI entered
- [ ] JWT Secret entered (use a strong random string)
- [ ] Cloudinary credentials entered
- [ ] Email credentials entered (if applicable)

### 3. Verify Setup
```powershell
# Check secrets were created
gcloud secrets list

# Verify Artifact Registry
gcloud artifacts repositories list --location=asia-south1
```
- [ ] All secrets listed
- [ ] Repository `ecommerce-repo` exists

---

## 🚀 DEPLOYMENT CHECKLIST

### 1. Pre-Deployment Verification
- [ ] All code changes committed
- [ ] Local development tested and working
- [ ] No errors in client or server console

### 2. Build Client Locally (Optional Test)
```powershell
cd client
npm install
npm run build
```
- [ ] Client builds without errors
- [ ] `client/dist` folder created
- [ ] `client/dist/index.html` exists
- [ ] `client/dist/client.js` exists

### 3. Run Deployment Script
```powershell
.\deploy-gcp.ps1
```

**Monitor the deployment:**
- [ ] Step 1: Client build completes
- [ ] Step 2: Docker configured for Artifact Registry
- [ ] Step 3: Docker image builds successfully
- [ ] Step 4: Image pushed to Artifact Registry
- [ ] Step 5: Cloud Run deployment completes
- [ ] Service URL displayed

### 4. Save Service URL
```powershell
# Get your service URL
gcloud run services describe ecommerce-monolith --region asia-south1 --format 'value(status.url)'
```
- [ ] Service URL obtained (save it)

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Test Health Endpoint
```powershell
# Replace with your actual URL
curl https://your-service-url/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```
- [ ] Health endpoint returns 200 OK
- [ ] Response is valid JSON

### 2. Test Frontend
- [ ] Open service URL in browser
- [ ] Homepage loads correctly
- [ ] No console errors (F12 → Console)
- [ ] Network requests go to `/api/*` (not external URL)

### 3. Test API Endpoints
- [ ] Login works
- [ ] Register works
- [ ] Protected routes work
- [ ] Image upload works (if applicable)

### 4. Test Database Connection
- [ ] Data is saved to MongoDB
- [ ] Data is retrieved correctly
- [ ] No connection errors in logs

### 5. Check Logs
```powershell
gcloud run logs read --service ecommerce-monolith --limit 50
```
- [ ] No error logs
- [ ] Server started successfully
- [ ] MongoDB connected
- [ ] SSR working (check for SSR logs)

---

## 🔍 TROUBLESHOOTING CHECKLIST

### If Deployment Fails

#### Build Errors
- [ ] Check Node.js version (must be 20+)
- [ ] Clear `node_modules` and reinstall
- [ ] Check for TypeScript errors
- [ ] Verify `package.json` scripts are correct

#### Docker Errors
- [ ] Docker Desktop is running
- [ ] Docker has enough disk space
- [ ] Check Dockerfile syntax
- [ ] Try building locally: `docker build -t test .`

#### GCP Errors
- [ ] Verify authentication: `gcloud auth list`
- [ ] Check project is set: `gcloud config get-value project`
- [ ] Verify APIs are enabled
- [ ] Check IAM permissions
- [ ] Verify billing is enabled

#### Secret Manager Errors
- [ ] Check secrets exist: `gcloud secrets list`
- [ ] Verify permissions granted
- [ ] Check secret versions: `gcloud secrets versions list SECRET_NAME`

### If App Doesn't Work After Deployment

#### MongoDB Connection Issues
- [ ] Verify connection string is correct
- [ ] Check MongoDB Atlas network access allows `0.0.0.0/0`
- [ ] Verify database user exists and password is correct
- [ ] Special characters in password are URL-encoded
- [ ] Check MongoDB Atlas cluster is running

#### API Errors
- [ ] Check logs for errors
- [ ] Verify all secrets are set correctly
- [ ] Test `/api/health` endpoint
- [ ] Check CORS settings in `server/src/server.js`

#### Frontend Not Loading
- [ ] Verify client was built: check logs for "Client built successfully"
- [ ] Check browser console for errors (F12)
- [ ] Verify network requests going to `/api/*`
- [ ] Check if `dist` folder was created during build

### View Detailed Logs
```powershell
# Real-time logs
gcloud run logs tail --service ecommerce-monolith

# Filter errors only
gcloud run logs read --service ecommerce-monolith --limit 100 | Select-String "ERROR"

# Specific time range
gcloud run logs read --service ecommerce-monolith --limit 100 --format json
```

---

## 🔄 REDEPLOYMENT CHECKLIST

For updates after initial deployment:

### Quick Redeploy
```powershell
.\deploy-gcp.ps1
```
- [ ] Deployment completes
- [ ] Test new changes work

### If Secrets Changed
```powershell
# Update secret
echo "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy to pick up new secret
.\deploy-gcp.ps1
```

---

## 📊 COST MONITORING CHECKLIST

### Set Up Billing Alerts
- [ ] Go to GCP Console → Billing → Budgets & alerts
- [ ] Create budget: $30/month
- [ ] Set alert thresholds: 50%, 90%, 100%
- [ ] Add email notifications

### Monitor Usage
- [ ] Check Cloud Run metrics weekly
- [ ] Review billing reports monthly
- [ ] Optimize if costs exceed expectations

---

## ✨ NICE-TO-HAVE (Optional)

### Custom Domain
- [ ] Domain purchased and verified
- [ ] DNS configured
- [ ] SSL certificate obtained
- [ ] Domain mapped in Cloud Run

### CI/CD
- [ ] GitHub Actions workflow created
- [ ] Auto-deploy on push to main
- [ ] Run tests before deploy

### Monitoring
- [ ] Uptime checks configured
- [ ] Error alerts set up
- [ ] Performance monitoring enabled

---

## 📞 HELP RESOURCES

- **This Project Docs:**
  - `README.md` - Project overview
  - `QUICK_START_GCP.md` - Quick start guide
  - `DEPLOYMENT_GUIDE.md` - Detailed guide
  - `GCP_SETUP_SUMMARY.md` - Setup summary

- **GCP Resources:**
  - GCP Console: https://console.cloud.google.com
  - Cloud Run Docs: https://cloud.google.com/run/docs
  - Troubleshooting: https://cloud.google.com/run/docs/troubleshooting

- **External Services:**
  - MongoDB Atlas: https://cloud.mongodb.com
  - Cloudinary: https://cloudinary.com/console

---

## ✅ FINAL VERIFICATION

Before marking deployment as complete:

- [ ] App is accessible at Cloud Run URL
- [ ] Health endpoint returns 200 OK
- [ ] Frontend loads with no console errors
- [ ] Login/Register works
- [ ] Database operations work
- [ ] File uploads work (if applicable)
- [ ] Logs show no errors
- [ ] Service is scaling properly
- [ ] Billing alerts are set
- [ ] Documentation is updated
- [ ] Service URL is saved/bookmarked
- [ ] MongoDB Atlas IP whitelist confirmed

---

**Date Deployed:** _______________  
**Service URL:** _______________  
**Deployed By:** _______________  
**Notes:** _______________

---

🎉 **Congratulations!** Your application is now deployed to GCP!
