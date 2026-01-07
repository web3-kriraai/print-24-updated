# GCP Setup Script - Creates required resources for deployment
# Run this script ONCE before first deployment

# Configuration
$PROJECT_ID = "prints24-web"  # Your existing GCP project ID
$REGION = "asia-south1"
$REPOSITORY_NAME = "ecommerce-repo"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "GCP Initial Setup for Print24/Ecommerce" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Set active project
Write-Host "`nStep 1: Setting active GCP project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "  X Failed to set project. Please check PROJECT_ID" -ForegroundColor Red
    exit 1
}
Write-Host "  OK Project set to: $PROJECT_ID" -ForegroundColor Green

# Step 2: Enable required APIs
Write-Host "`nStep 2: Enabling required GCP APIs..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray

$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor Gray
    gcloud services enable $api --quiet
}
Write-Host "  OK All APIs enabled" -ForegroundColor Green

# Step 3: Create Artifact Registry repository
Write-Host "`nStep 3: Creating Artifact Registry repository..." -ForegroundColor Yellow
$repoCheck = gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  INFO Repository already exists, skipping..." -ForegroundColor Yellow
} else {
    gcloud artifacts repositories create $REPOSITORY_NAME --repository-format=docker --location=$REGION --description="Docker repository for ecommerce application"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Artifact Registry repository created" -ForegroundColor Green
    } else {
        Write-Host "  X Failed to create repository" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Create secrets
Write-Host "`nStep 4: Creating Secret Manager secrets..." -ForegroundColor Yellow
Write-Host "  You'll need to provide values for each secret" -ForegroundColor Gray

$secrets = @(
    @{Name="MONGO_TEST_URI"; Description="MongoDB connection string"},
    @{Name="JWT_SECRET"; Description="JWT secret key (random string)"},
    @{Name="CLOUDINARY_CLOUD_NAME"; Description="Cloudinary cloud name"},
    @{Name="CLOUDINARY_API_KEY"; Description="Cloudinary API key"},
    @{Name="CLOUDINARY_API_SECRET"; Description="Cloudinary API secret"}
)

foreach ($secret in $secrets) {
    $secretName = $secret.Name
    $secretDesc = $secret.Description
    
    # Check if secret already exists
    $secretCheck = gcloud secrets describe $secretName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  INFO Secret '$secretName' already exists" -ForegroundColor Yellow
        $update = Read-Host "    Update it? (y/n)"
        if ($update -ne "y") {
            continue
        }
    } else {
        # Create the secret
        gcloud secrets create $secretName --replication-policy="automatic" --quiet
    }
    
    # Get value from user
    Write-Host "  Enter value for $secretName ($secretDesc):" -ForegroundColor Cyan
    $secretValue = Read-Host "    Value"
    
    if ($secretValue) {
        # Add secret version
        echo $secretValue | gcloud secrets versions add $secretName --data-file=-
        Write-Host "  OK Secret '$secretName' configured" -ForegroundColor Green
    } else {
        Write-Host "  WARNING Skipped '$secretName' (empty value)" -ForegroundColor Yellow
    }
}

# Step 5: Grant Cloud Run access to secrets
Write-Host "`nStep 5: Granting Cloud Run access to secrets..." -ForegroundColor Yellow

# Get the project number
$PROJECT_NUMBER = (gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
$SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

Write-Host "  Service Account: $SERVICE_ACCOUNT" -ForegroundColor Gray

foreach ($secret in $secrets) {
    $secretName = $secret.Name
    gcloud secrets add-iam-policy-binding $secretName --member="serviceAccount:$SERVICE_ACCOUNT" --role="roles/secretmanager.secretAccessor" --quiet 2>$null
}
Write-Host "  OK Permissions granted" -ForegroundColor Green

# Step 6: Summary
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Verify your MongoDB Atlas network access allows all IPs (0.0.0.0/0)" -ForegroundColor White
Write-Host "  2. Update your secrets if needed:" -ForegroundColor White
Write-Host "     gcloud secrets versions add SECRET_NAME --data-file=-" -ForegroundColor Gray
Write-Host "  3. Deploy your application:" -ForegroundColor White
Write-Host "     .\deploy-gcp.ps1" -ForegroundColor Gray
Write-Host "`nResources created:" -ForegroundColor Cyan
Write-Host "  - Project: $PROJECT_ID" -ForegroundColor White
Write-Host "  - Region: $REGION (Mumbai)" -ForegroundColor White
Write-Host "  - Artifact Registry: $REPOSITORY_NAME" -ForegroundColor White
Write-Host "  - Secrets: $($secrets.Count) secrets configured" -ForegroundColor White
