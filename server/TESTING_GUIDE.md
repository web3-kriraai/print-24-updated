# Testing Scripts - Quick Guide

## Available Test Scripts

### 1. Complete E2E Workflow Test
**File:** `test-complete-e2e-flow.js`

**Tests:**
- Order creation
- Payment processing
- Smart routing
- Shiprocket order creation
- AWB generation
- Pickup request
- Webhook lifecycle

**Usage:**
```bash
node src/scripts/test-complete-e2e-flow.js
```

**Features:**
- ✅ Complete order-to-delivery flow
- ✅ Real Shiprocket API calls
- ✅ Mock AWB support (no KYC needed)
- ✅ Detailed request/response logging

---

### 2. AWB Tracking Test
**File:** `test-awb-tracking.js`

**Tests:**
- Tracking by AWB code
- Tracking by Shiprocket Order ID
- Database timeline display

**Usage:**
```bash
# Test with specific AWB
node src/scripts/test-awb-tracking.js <AWB_CODE>

# Test with latest database order
node src/scripts/test-awb-tracking.js --db
```

**Output:**
- Current shipment status
- Origin and destination
- Courier details
- Complete tracking timeline
- Database tracking comparison

---

### 3. Webhook Test
**File:** `test-webhook.js`

**Tests:**
- Webhook endpoint connectivity
- Status update processing
- Database updates
- Timeline entries

**Usage:**
```bash
# Test with specific order
node src/scripts/test-webhook.js <ORDER_NUMBER>

# Test with latest order
node src/scripts/test-webhook.js
```

**Simulates:**
1. Pickup Scheduled
2. Shipped
3. In Transit
4. Out For Delivery
5. Delivered

**Note:** Server must be running on `localhost:5000` for webhooks to work.

---

## Test Workflow

### Recommended Testing Order

```bash
# Step 1: Test complete E2E flow first
node src/scripts/test-complete-e2e-flow.js

# Step 2: Test tracking with generated AWB
node src/scripts/test-awb-tracking.js --db

# Step 3: Test webhooks (ensure server is running)
node src/scripts/test-webhook.js
```

---

## Common Issues & Solutions

### Issue: AWB Generation Failed (KYC Error)

**Solution:**
```env
# Enable mock AWB mode
USE_MOCK_AWB=true
```

### Issue: Webhook Tests Fail

**Cause:** Server not running or wrong URL

**Solution:**
```bash
# 1. Start server in another terminal
npm start

# 2. Check webhook URL in .env
WEBHOOK_TEST_URL=http://localhost:5000/api/webhooks/courier-update
```

### Issue: Tracking Returns Empty Data

**Cause:** AWB not in Shiprocket system (mock AWB used)

**Expected:** Mock AWBs won't have real tracking data. This is normal for testing.

---

## Environment Variables for Testing

```env
# Database
MONGO_TEST_URI=mongodb://...

# Shiprocket
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_API="your-api-key"

# Testing Config
USE_MOCK_AWB=true          # Use mock AWB for testing
WEBHOOK_TEST_URL=http://localhost:5000/api/webhooks/courier-update
```

---

## What Each Script Tests

| Script | Order Creation | Payment | Shiprocket API | AWB | Pickup | Tracking | Webhooks |
|--------|----------------|---------|----------------|-----|--------|----------|----------|
| `test-complete-e2e-flow.js` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (simulated) |
| `test-awb-tracking.js` | ❌ | ❌ | ✅ | ✅ (existing) | ❌ | ✅ | ❌ |
| `test-webhook.js` | ❌ | ❌ | ❌ | ✅ (existing) | ❌ | ❌ | ✅ (simulated) |

---

## Production vs Test Mode

### Test Mode (Current)
```env
USE_MOCK_AWB=true  # or not set
```
- Mock AWB codes generated
- No KYC required
- Full testing possible
- Tracking data simulated

### Production Mode
```env
USE_MOCK_AWB=false
```
- Real AWB codes from Shiprocket
- KYC must be completed
- Real pickups scheduled
- Real tracking data from courier

---

## Quick Commands

```bash
# Run all tests in sequence
node src/scripts/test-complete-e2e-flow.js && \
node src/scripts/test-awb-tracking.js --db && \
node src/scripts/test-webhook.js

# Test only tracking
node src/scripts/test-awb-tracking.js MOCK12345678XYZ

# Test webhooks with specific order
node src/scripts/test-webhook.js ORD-1234567890
```

---

**All scripts are production-ready and include detailed logging!**
