# Deployment Guide - Print24 to Google Cloud Platform

This guide explains how to deploy your Print24 application (client + server) as a single service on Google Cloud Run.

## Architecture

- **Single Server Deployment**: The server serves both the API (`/api/*`) and the static frontend files
- **Client Build**: React app is built to static files in `client/dist`
- **Server Integration**: Express server serves the client files and handles SSR
- **Docker**: Multi-stage build creates an optimized production image
- **Cloud Run**: Serverless deployment with automatic scaling

## Prerequisites

1. **Google Cloud Account**: Create a GCP account at https://cloud.google.com
2. **Google Cloud CLI**: Install `gcloud` CLI tool
3. **Docker**: Install Docker Desktop
4. **Node.js**: Version 20 or higher

## Step 1: Setup Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create your-project-id --name="Print24 App"

# Set the project as active
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 2: Configure Secrets in Google Cloud

Store sensitive environment variables as secrets:

```bash
# Create secrets for sensitive data
echo -n "your-mongo-uri" | gcloud secrets create MONGO_URI --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "your-cloudinary-cloud-name" | gcloud secrets create CLOUDINARY_CLOUD_NAME --data-file=-
echo -n "your-cloudinary-api-key" | gcloud secrets create CLOUDINARY_API_KEY --data-file=-
echo -n "your-cloudinary-api-secret" | gcloud secrets create CLOUDINARY_API_SECRET --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding MONGO_URI \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for other secrets...
```

## Step 3: Environment Variables

### Client (.env)

The client doesn't need environment variables for production since it will be served from the same server.

**For development only:**
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Server (.env)

Create `server/.env` for local development:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-strong-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Note:** For production, these are stored in Google Cloud Secrets (see Step 2).

## Step 4: Update API Calls in Client

Your client should use relative URLs for API calls in production:

```javascript
// Good - works in both development and production
const response = await axios.get('/api/products');

// Or with proper base URL configuration
const baseURL = import.meta.env.VITE_API_BASE_URL || '';
axios.create({ baseURL });
```

## Step 5: Build Locally (Optional Test)

Test the build before deploying:

```bash
# Build the client
cd client
npm install
npm run build
cd ..

# Build Docker image
docker build -t print24-app:test .

# Run locally
docker run -p 8080:8080 \
  -e MONGO_URI=your-mongo-uri \
  -e JWT_SECRET=your-jwt-secret \
  print24-app:test

# Test at http://localhost:8080
```

## Step 6: Deploy to Cloud Run

### Option A: Using the Deployment Script (Recommended)

1. Edit `deploy-gcp.ps1` (Windows) or `deploy-gcp.sh` (Mac/Linux)
2. Update the `PROJECT_ID` variable to your GCP project ID
3. Run the script:

**Windows (PowerShell):**
```powershell
.\deploy-gcp.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

### Option B: Manual Deployment

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id
export SERVICE_NAME=print24-app
export REGION=us-central1

# Build the client
cd client
npm install
npm run build
cd ..

# Configure Docker for GCP
gcloud auth configure-docker

# Build and push Docker image
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-secrets="MONGO_URI=MONGO_URI:latest,JWT_SECRET=JWT_SECRET:latest,CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest"
```

## Step 7: Access Your Application

After deployment, get your service URL:

```bash
gcloud run services describe print24-app \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

Your app will be accessible at: `https://print24-app-XXXXX-uc.a.run.app`

## Troubleshooting

### Build Fails

- **Check Node version**: Ensure Node 20+ is installed
- **Clear cache**: Delete `node_modules` and reinstall
- **Check logs**: Review Docker build logs for errors

### Deployment Fails

- **Check IAM permissions**: Ensure your account has Cloud Run Admin role
- **Verify secrets**: Make sure all secrets are created and accessible
- **Check quotas**: Verify your GCP project has sufficient quotas

### App Not Working After Deployment

1. **Check logs**:
   ```bash
   gcloud run logs read --service print24-app --limit 50
   ```

2. **Test health endpoint**:
   ```bash
   curl https://your-app-url/api/health
   ```

3. **Verify environment variables**:
   - Check secrets are properly set
   - Verify MongoDB connection string
   - Test MongoDB network access (whitelist Cloud Run IPs: 0.0.0.0/0)

### MongoDB Connection Issues

- **Whitelist IPs**: In MongoDB Atlas, go to Network Access and add `0.0.0.0/0` to allow all IPs
- **Check connection string**: Ensure username, password, and database name are correct
- **URL encoding**: Special characters in password must be URL-encoded

## Updating the Application

To update your deployed application:

```bash
# Make your code changes
# Then rebuild and redeploy

cd client
npm run build
cd ..

docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --region ${REGION}
```

## Cost Optimization

- **Set min-instances to 0**: Scales down to zero when not in use
- **Adjust memory/CPU**: Start with 1Gi/1 CPU, adjust based on usage
- **Monitor usage**: Use GCP console to track costs
- **Set billing alerts**: Configure alerts for unexpected costs

## Monitoring

- **Cloud Run Metrics**: View in GCP Console > Cloud Run > print24-app > Metrics
- **Logs**: GCP Console > Cloud Run > print24-app > Logs
- **Alerts**: Set up uptime checks and alerts in Cloud Monitoring

## Security Checklist

- ✅ Use secrets for sensitive data (not environment variables)
- ✅ Enable HTTPS (Cloud Run does this by default)
- ✅ Whitelist MongoDB IPs
- ✅ Use strong JWT secrets
- ✅ Keep dependencies updated
- ✅ Enable Cloud Armor for DDoS protection (optional)
- ✅ Set up IAM roles properly
- ✅ Enable audit logging

## Need Help?

- **GCP Documentation**: https://cloud.google.com/run/docs
- **Cloud Run Pricing**: https://cloud.google.com/run/pricing
- **Support**: https://cloud.google.com/support
