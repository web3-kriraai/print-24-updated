# 🚀 QUICK INTEGRATION GUIDE

**Get your new pricing features running in 5 minutes!**

---

## Step 1: Register New Routes (2 minutes)

### **Option A: Add to existing admin routes**

Open: `server/src/routes/admin/index.js` (or wherever you register admin routes)

Add:
```javascript
import pricingAdvancedRoutes from './pricingAdvancedRoutes.js';

// Register routes
router.use('/', pricingAdvancedRoutes);
```

### **Option B: Register in main server file**

Open: `server/src/server.js`

Add:
```javascript
import pricingAdvancedRoutes from './routes/admin/pricingAdvancedRoutes.js';

// After other route registrations
app.use('/api/admin', pricingAdvancedRoutes);
```

---

## Step 2: Test the Endpoints (3 minutes)

### **Test 1: Condition Validation**

```bash
curl -X POST http://localhost:5000/api/admin/modifiers/validate-conditions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "conditions": {
      "AND": [
        { "field": "geo_zone_id", "operator": "EQUALS", "value": "test_id" }
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "valid": true,
  "errors": []
}
```

---

### **Test 2: Virtual Price Book View**

```bash
curl -X POST http://localhost:5000/api/admin/price-books/view \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "priceBookId": "YOUR_PRICE_BOOK_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "view": [
    {
      "product": { "name": "Product Name" },
      "basePrice": 100,
      "virtualPrice": 85,
      "appliedModifiers": []
    }
  ],
  "count": 1
}
```

---

### **Test 3: Standardized Pricing API**

```bash
curl -X POST http://localhost:5000/api/v1/pricing/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": ["YOUR_PRODUCT_ID"],
    "context": {
      "country_code": "IN",
      "currency": "INR"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "YOUR_PRODUCT_ID",
      "is_available": true,
      "currency": "INR",
      "price_breakdown": {
        "base_price": 500,
        "final_price": 500
      }
    }
  ]
}
```

---

## Step 3: Update Price Modifier Schema (Optional)

If you want to use JSON conditions in existing modifiers:

### **Option A: Add field via MongoDB**

```javascript
// Run in MongoDB shell or Compass
db.pricemodifiers.updateMany(
  {},
  {
    $set: {
      conditions: null
    }
  }
)
```

### **Option B: Migration script**

Create: `server/src/scripts/addConditionsField.js`

```javascript
import mongoose from 'mongoose';
import PriceModifier from '../models/PriceModifier.js';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const result = await PriceModifier.updateMany(
    { conditions: { $exists: false } },
    { $set: { conditions: null } }
  );
  
  console.log(`Updated ${result.modifiedCount} modifiers`);
  process.exit(0);
}

migrate();
```

Run:
```bash
cd server
node src/scripts/addConditionsField.js
```

---

## Step 4: Create Sample Data (Optional)

### **Create Hierarchical Zones**

```javascript
// USA Country
POST /api/admin/geo-zones
{
  "name": "USA",
  "code": "US",
  "level": "COUNTRY",
  "currency": "USD",
  "parentZone": null
}

// New York State
POST /api/admin/geo-zones
{
  "name": "New York",
  "code": "NY",
  "level": "STATE",
  "currency": "USD",
  "parentZone": "USA_ZONE_ID"
}
```

### **Create Modifier with Conditions**

```javascript
POST /api/admin/price-modifiers
{
  "name": "Florida Cards Promo",
  "appliesTo": "COMBINATION",
  "modifierType": "PERCENT_DEC",
  "value": 5,
  "priority": 10,
  "isActive": true,
  "conditions": {
    "AND": [
      { "field": "geo_zone_id", "operator": "EQUALS", "value": "FLORIDA_ZONE_ID" },
      { "field": "category_id", "operator": "EQUALS", "value": "CARDS_CATEGORY_ID" }
    ]
  }
}
```

---

## Step 5: Verify Everything Works

### **Checklist:**

- [ ] Routes registered successfully
- [ ] Server starts without errors
- [ ] Condition validation endpoint works
- [ ] Virtual view endpoint works
- [ ] Pricing resolution API works
- [ ] Hierarchical zones can be created
- [ ] Conflict detection works

---

## 🎯 **Quick Test Script**

Save as `test-pricing.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"
TOKEN="YOUR_ADMIN_TOKEN"

echo "Testing Pricing System..."

# Test 1: Validate Conditions
echo "\n1. Testing condition validation..."
curl -X POST "$BASE_URL/api/admin/modifiers/validate-conditions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"conditions":{"AND":[{"field":"test","operator":"EQUALS","value":"test"}]}}'

# Test 2: Get Geo Zone Hierarchy
echo "\n\n2. Testing geo zone hierarchy..."
curl -X GET "$BASE_URL/api/admin/geo-zones/hierarchy" \
  -H "Authorization: Bearer $TOKEN"

# Test 3: Pricing Resolution
echo "\n\n3. Testing pricing resolution..."
curl -X POST "$BASE_URL/api/v1/pricing/resolve" \
  -H "Content-Type: application/json" \
  -d '{"product_ids":["test"],"context":{"currency":"INR"}}'

echo "\n\nAll tests complete!"
```

Run:
```bash
chmod +x test-pricing.sh
./test-pricing.sh
```

---

## 🐛 **Troubleshooting**

### **Issue: Routes not found (404)**

**Solution:**
```javascript
// Check server.js has:
import pricingAdvancedRoutes from './routes/admin/pricingAdvancedRoutes.js';
app.use('/api/admin', pricingAdvancedRoutes);

// Restart server
npm start
```

---

### **Issue: Module not found**

**Solution:**
```bash
# Make sure all files exist:
ls server/src/services/pricing/ConditionEvaluator.js
ls server/src/services/pricing/PriceBookViewGenerator.js
ls server/src/controllers/admin/pricingAdminControllerExtensions.js
ls server/src/routes/admin/pricingAdvancedRoutes.js
```

---

### **Issue: Mongoose schema errors**

**Solution:**
```javascript
// Clear mongoose model cache
delete mongoose.connection.models['GeoZone'];
delete mongoose.connection.models['PriceModifier'];

// Restart server
```

---

## 📚 **Next Steps**

1. **Test all endpoints** with Postman
2. **Create sample data** for testing
3. **Build frontend UI** for new features
4. **Update documentation** for your team

---

## 🎉 **You're Done!**

Your enterprise-grade pricing system is now fully operational!

**What you have:**
- ✅ Complex condition engine
- ✅ Hierarchical geo zones
- ✅ Virtual price views
- ✅ Conflict detection
- ✅ Standardized API

**Questions?**
- Check `.agent/PRICING_IMPLEMENTATION_COMPLETE.md`
- Review `.agent/PRICING_QUICK_START.md`
- Test endpoints with Postman

**Happy Pricing! 🚀**
