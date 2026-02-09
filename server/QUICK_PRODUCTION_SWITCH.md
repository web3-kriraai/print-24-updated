# Quick Production Switch Guide

## 🎯 One Simple Change

To switch from **TEST** to **PRODUCTION**, just update your `.env` file:

### File: `server/.env`

**Add this line:**
```env
USE_MOCK_AWB=false
```

**Restart your server:**
```bash
npm start
```

✅ **Done!** You're now using real Shiprocket AWB codes!

---

## Before Going Live

1. ✅ Complete Shiprocket KYC verification
2. ✅ Wait for KYC approval
3. ✅ Add `USE_MOCK_AWB=false` to `.env`
4. ✅ Configure webhook URL in Shiprocket dashboard
5. ✅ Restart server

---

## Current Setup

### Already Configured ✅
- Shiprocket API credentials
- Production API URL  
- Webhook handlers
- Smart routing
- Order management

### Only Need to Add ⚙️
```env
USE_MOCK_AWB=false
```

---

## Verify It's Working

Run test after change:
```bash
cd server
node src/scripts/test-complete-e2e-flow.js
```

Look for:
```
Is Mock: No (Real AWB)  ← Should say "No" not "Yes"
AWB Code: 784412345    ← Real code (not MOCK...)
```

---

## Rollback to Test

Need to go back to test mode?

```env
USE_MOCK_AWB=true
```

Restart server. Back to test mode!

---

**That's all you need to change! Everything else is ready.** 🚀
