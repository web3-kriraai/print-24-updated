#!/bin/bash
# Script to update GCP Secrets from .env

PROJECT_ID="prints24-web"

update_secret() {
    local name=$1
    local value=$2
    echo "Updating secret: $name"
    
    # Create secret if it doesn't exist
    gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "Creating secret $name..."
        gcloud secrets create "$name" --project="$PROJECT_ID" --replication-policy="automatic"
    fi
    
    # Add new version
    echo -n "$value" | gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file=-
}

# Values from .env
update_secret 'MONGO_URI' 'mongodb+srv://print24:XdTuxSHbxpp6JAUt@cluster0.azagder.mongodb.net/'
update_secret 'MONGO_URI' 'mongodb+srv://print24:XdTuxSHbxpp6JAUt@cluster0.azagder.mongodb.net/'
update_secret 'JWT_SECRET' 'MY_PRINT_25_SECRET_2025'
update_secret 'CLOUDINARY_CLOUD_NAME' 'dwggbfodl'
update_secret 'CLOUDINARY_API_KEY' '949489366333659'
update_secret 'CLOUDINARY_API_SECRET' 'bRIX6GkX1Fpd6hoZGvGeAddopbo'
update_secret 'REDIS_URL' 'rediss://default:AZGZAAIncDFiODMwYjljYWRjNDg0Y2M3ODhkNzRiNjZjOWIwNDM1ZXAxMzcyNzM@decent-swan-37273.upstash.io:6379'
update_secret 'SHIPROCKET_EMAIL' 'kriraaiinfotech@gmail.com'
update_secret 'SHIPROCKET_API' 'nI4Wdc!@$IfdY*sMKmC23Bk#F7#S5w1B'
update_secret 'EMAIL_HOST' 'smtp.gmail.com'
update_secret 'EMAIL_PORT' '587'
update_secret 'EMAIL_USER' 'malinarendra7874@gmail.com'
update_secret 'EMAIL_PASSWORD' 'xdkdqzewixkrzcys'
update_secret 'EMAIL_FROM' 'Print24 <malinarendra7874@gmail.com>'
update_secret 'GCP_GEOLOCATION_API_KEY' 'AIzaSyBw42qPsnQsVY5uiugZAq4ET0ZP6zXBq8Q'
update_secret 'EXCHANGE_RATE_API_KEY' 'f1c1ab2947b82504a62879b1'
update_secret 'ENCRYPTION_KEY' '8555da099f07ff7421ff1070241663941aa6254b2f1f5296dea292b2eb68538f'
update_secret 'FRONTEND_URL' 'https://print24-production-680867814154.asia-south1.run.app'
