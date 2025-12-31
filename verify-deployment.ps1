# Pre-Deployment Verification Script
# Run this before deploying to ensure everything is configured correctly

Write-Host "==========================================="  -ForegroundColor Cyan
Write-Host "Print24 Pre-Deployment Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$PROJECT_ID = "prints24-web"
$REGION = "asia-south1"
$REPOSITORY_NAME = "ecommerce-repo"

$allChecks = $true

# Check 1: GCloud CLI
Write-Host ""
Write-Host "[1/8] Checking gcloud CLI..." -ForegroundColor Yellow
try {
    $null = gcloud version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK gcloud CLI is installed" -ForegroundColor Green
    } else {
        Write-Host "  FAIL gcloud CLI not found" -ForegroundColor Red
        $allChecks = $false
    }
} catch {
    Write-Host "  FAIL gcloud CLI not found" -ForegroundColor Red
    $allChecks = $false
}

# Check 2: Docker
Write-Host ""
Write-Host "[2/8] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Docker is installed" -ForegroundColor Green
        
        $null = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK Docker is running" -ForegroundColor Green
        } else {
            Write-Host "  FAIL Docker is not running. Please start Docker Desktop." -ForegroundColor Red
            $allChecks = $false
        }
    } else {
        Write-Host "  FAIL Docker not found" -ForegroundColor Red
        $allChecks = $false
    }
} catch {
    Write-Host "  FAIL Docker not found" -ForegroundColor Red
    $allChecks = $false
}

# Check 3: Node.js
Write-Host ""
Write-Host "[3/8] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Node.js is installed: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  FAIL Node.js not found" -ForegroundColor Red
        $allChecks = $false
    }
} catch {
    Write-Host "  FAIL Node.js not found" -ForegroundColor Red
    $allChecks = $false
}

# Check 4: GCP Project
Write-Host ""
Write-Host "[4/8] Checking GCP project..." -ForegroundColor Yellow
$currentProject = gcloud config get-value project 2>$null
if ($currentProject -eq $PROJECT_ID) {
    Write-Host "  OK GCP project is set to: $PROJECT_ID" -ForegroundColor Green
} else {
    Write-Host "  FAIL GCP project mismatch. Current: $currentProject, Expected: $PROJECT_ID" -ForegroundColor Red
    Write-Host "    Run: gcloud config set project $PROJECT_ID" -ForegroundColor Gray
    $allChecks = $false
}

# Check 5: Artifact Registry Repository
Write-Host ""
Write-Host "[5/8] Checking Artifact Registry repository..." -ForegroundColor Yellow
$null = gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Repository '$REPOSITORY_NAME' exists in $REGION" -ForegroundColor Green
} else {
    Write-Host "  FAIL Repository '$REPOSITORY_NAME' not found" -ForegroundColor Red
    Write-Host "    Run: .\setup-gcp.ps1 to create the repository" -ForegroundColor Gray
    $allChecks = $false
}

# Check 6: Required Secrets
Write-Host ""
Write-Host "[6/8] Checking required secrets..." -ForegroundColor Yellow
$requiredSecrets = @("MONGO_TEST_URI", "JWT_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")

$secretCheckFailed = $false
foreach ($secret in $requiredSecrets) {
    $null = gcloud secrets describe $secret 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Secret '$secret' exists" -ForegroundColor Green
    } else {
        Write-Host "  FAIL Secret '$secret' not found" -ForegroundColor Red
        $secretCheckFailed = $true
    }
}

if ($secretCheckFailed) {
    Write-Host "    Run: .\setup-gcp.ps1 to create missing secrets" -ForegroundColor Gray
    $allChecks = $false
}

# Check 7: Client Build
Write-Host ""
Write-Host "[7/8] Checking client build..." -ForegroundColor Yellow
if (Test-Path "client/dist") {
    Write-Host "  OK Client is built" -ForegroundColor Green
} else {
    Write-Host "  WARN Client not built yet" -ForegroundColor Yellow
    Write-Host "    Will be built during deployment" -ForegroundColor Gray
}

# Check 8: Deployment Script
Write-Host ""
Write-Host "[8/8] Checking deployment script..." -ForegroundColor Yellow
if (Test-Path "deploy-gcp.ps1") {
    Write-Host "  OK deploy-gcp.ps1 exists" -ForegroundColor Green
} else {
    Write-Host "  FAIL deploy-gcp.ps1 not found" -ForegroundColor Red
    $allChecks = $false
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($allChecks) {
    Write-Host "SUCCESS: All checks passed!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You're ready to deploy!" -ForegroundColor Green
    Write-Host "Run: .\deploy-gcp.ps1" -ForegroundColor Cyan
} else {
    Write-Host "FAILED: Some checks failed" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please fix the issues above before deploying." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "  1. Run .\setup-gcp.ps1 to set up GCP resources" -ForegroundColor White
    Write-Host "  2. Ensure Docker Desktop is running" -ForegroundColor White
    Write-Host "  3. Install Node.js 20+ if needed" -ForegroundColor White
}

Write-Host ""
