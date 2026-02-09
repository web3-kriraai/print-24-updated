# Production Configuration Guide

## Current Status: TEST MODE ✅

Your courier integration is fully functional in TEST mode with:
- ✅ Mock AWB generation (no KYC required)
- ✅ Real Shiprocket API for orders
- ✅ Complete webhook integration
- ✅ Smart routing working

## Switch to Production: Simple 2-Step Process

### Step 1: Complete Shiprocket KYC

1. Login to your Shiprocket dashboard
2. Complete KYC verification
3. Wait for approval (usually 24-48 hours)

### Step 2: Update Environment Variable

**File:** `server/.env`

**Change this line:**
```env
# Current (TEST MODE)
# No USE_MOCK_AWB variable = auto-falls back to mock on KYC errors
```

**To:**
```env
# Production (LIVE MODE) - after KYC approved
USE_MOCK_AWB=false
```

**That's it!** 🎉

## What Happens After Switch

### Automatic Changes

When you set `USE_MOCK_AWB=false`, the system will:

1. ✅ **Stop generating mock AWB codes**
2. ✅ **Start calling real Shiprocket AWB API**
3. ✅ **Generate actual courier AWB codes**
4. ✅ **Enable real pickup scheduling**
5. ✅ **Receive real webhook updates from couriers**

### No Code Changes Needed

❌ **NO** need to change:
- Service files
- Controller files
- Route files
- Model files
- Test scripts

✅ **Everything works automatically!**

## Current Configuration

### Environment Variables (`.env`)

```env
# Shiprocket Credentials (Already Configured)
SHIPROCKET_EMAIL=kriraaiinfotech@gmail.com
SHIPROCKET_API="nI4Wdc!@$IfdY*sMKmC23Bk#F7#S5w1B"

# Mock AWB Mode (Add this when going to production)
# USE_MOCK_AWB=false  # Uncomment and set to false for production
```

### API Endpoint

**Already configured correctly:**
```javascript
// ShiprocketService.js
this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
```

This is the **PRODUCTION** API URL ✅

No test/sandbox URL to change!

## Webhook Configuration

### After KYC Approval

1. **Login to Shiprocket Dashboard**
2. **Go to:** Settings → API → Webhook
3. **Set Webhook URL:**
   ```
   https://your-domain.com/api/webhooks/courier-update
   ```
4. **Select Events:**
   - ✅ Pickup Scheduled
   - ✅ Shipped
   - ✅ In Transit  
   - ✅ Out for Delivery
   - ✅ Delivered
   - ✅ RTO
5. **Save Configuration**

## Verification Checklist

### Before Going Live

- [ ] Shiprocket KYC approved
- [ ] `USE_MOCK_AWB=false` set in `.env`
- [ ] Webhook URL configured in Shiprocket
- [ ] Server restarted after `.env` changes
- [ ] Test order placed to verify real AWB

### Testing Production Mode

Run the test script:
```bash
cd server
node src/scripts/test-complete-e2e-flow.js
```

**Expected output:**
```
✅ AWB Generated!
   AWB Code: 7844123456789  # Real AWB code (not MOCK)
   Courier Partner: Blue Dart
   Is Mock: No (Real AWB)  # ← Should say "No"
```

## Rollback to Test Mode

If you need to go back to test mode:

```env
USE_MOCK_AWB=true
```

Restart server. Done!

## Summary

### Current State (TEST)
- Mock AWB: `ENABLED`
- Real Shiprocket Orders: `✅ Working`
- Real API Calls: `✅ Working`
- Smart Routing: `✅ Working`
- KYC Required: `❌ Not needed`

### Production State (LIVE)
- Mock AWB: `DISABLED`
- Real Shiprocket Orders: `✅ Working`
- Real API Calls: `✅ Working`
- Smart Routing: `✅ Working`
- KYC Required: `✅ Must be approved`
- Real AWB Codes: `✅ Generated`
- Real Pickups: `✅ Scheduled`

## Files Overview

### No Changes Needed ✅

These files are already production-ready:

| File | Purpose | Status |
|------|---------|--------|
| `ShiprocketService.js` | API integration | ✅ Production ready |
| `courierWebhook.controller.js` | Webhook handler | ✅ Production ready |
| `orderModal.js` | Order schema | ✅ Production ready |
| `courierRoutes.js` | API routes | ✅ Production ready |

### Configuration Only 🔧

Only this file needs a simple boolean change:

| File | Change | Line |
|------|--------|------|
| `.env` | `USE_MOCK_AWB=false` | Add new line |

## Questions?

### Q: Do I need different API credentials for production?
**A:** No! Same credentials work for both test and production.

### Q: Will my test orders be affected?
**A:** No! Old test orders remain unchanged.

### Q: Can I test production mode before going live?
**A:** Yes! Just set `USE_MOCK_AWB=false` and run test script.

### Q: What if KYC gets rejected?
**A:** Keep `USE_MOCK_AWB=true` and continue testing. Fix KYC issues and try again.

### Q: Do webhook URLs differ for test/production?
**A:** No, same webhook endpoint for both!

---

**Ready for Production:** Just 1 environment variable change! 🚀
