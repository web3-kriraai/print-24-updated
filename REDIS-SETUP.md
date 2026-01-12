# Redis Setup Guide for GCP Deployment

## Overview
Your Print24 application uses Redis for caching pricing calculations to improve performance. When deploying to GCP, you need to configure a Redis instance.

## Option 1: Upstash Redis (Recommended for Serverless)

### Advantages
- ✅ **Free tier available** (10,000 commands/day)
- ✅ Serverless (pay per request)
- ✅ Global edge network
- ✅ Easy setup (5 minutes)
- ✅ Works perfectly with Cloud Run

### Setup Steps

1. **Create Upstash Account**
   - Go to https://upstash.com
   - Sign up for free account
   - Verify your email

2. **Create Redis Database**
   - Click "Create Database"
   - Choose a name (e.g., `print24-redis`)
   - Select region closest to your Cloud Run region
   - Choose "Free" tier
   - Click "Create"

3. **Get Connection URL**
   - In your database dashboard, find "REST API" section
   - Copy the `UPSTASH_REDIS_REST_URL`
   - **OR** use the Redis URL format:
     ```
     redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:6379
     ```

4. **Configure Cloud Run**
   ```bash
   gcloud run services update print24-backend \
     --region=us-central1 \
     --update-env-vars REDIS_URL=your-upstash-redis-url
   ```

---

## Option 2: Google Cloud Memorystore

### Advantages
- ✅ Fully managed by Google
- ✅ High availability options
- ✅ VPC-native (more secure)

### Disadvantages
- ❌ Minimum cost ~$50/month
- ❌ Requires VPC connector setup
- ❌ More complex configuration

### Setup Steps

1. **Create Redis Instance**
   ```bash
   gcloud redis instances create print24-redis \
     --size=1 \
     --region=us-central1 \
     --tier=basic
   ```

2. **Create VPC Connector**
   ```bash
   gcloud compute networks vpc-access connectors create print24-connector \
     --region=us-central1 \
     --range=10.8.0.0/28
   ```

3. **Get Redis IP**
   ```bash
   gcloud redis instances describe print24-redis \
     --region=us-central1 \
     --format="get(host)"
   ```

4. **Update Cloud Run with VPC Connector**
   ```bash
   gcloud run services update print24-backend \
     --region=us-central1 \
     --vpc-connector=print24-connector \
     --update-env-vars REDIS_URL=redis://REDIS_IP:6379
   ```

---

## Testing Redis Connection

After configuring, test your Redis connection:

1. **Check Cloud Run Logs**
   ```bash
   gcloud run services logs read print24-backend --region=us-central1
   ```

2. **Look for Redis Connection Messages**
   - `✅ Redis: Connected successfully` - Success!
   - `❌ Redis connection failed` - Check your REDIS_URL
   - `⚠️ Pricing will work without cache` - App works but slower

3. **Test Pricing API**
   - Make a pricing request to your deployed app
   - Check logs for cache HIT/MISS messages

---

## Environment Variable Format

Your app supports both formats:

```bash
# Option 1: Full Redis URL (Recommended)
REDIS_URL=redis://default:password@endpoint:6379

# Option 2: Separate host (Legacy)
REDIS_HOST=your-redis-host
```

---

## Recommendation

**For Cloud Run deployment, use Upstash Redis:**
- No VPC setup required
- Free tier available
- Perfect for serverless architecture
- 5-minute setup

The application gracefully handles Redis being unavailable - it will just run slower without caching.
