# User-Specific Dynamic Pricing - Usage Guide

This guide shows how to use the dynamic pricing system that displays different prices to different users based on their segment, location, and tier.

---

## 🎯 Quick Start

### For Guest Users (Not Logged In)
```javascript
// Frontend example - Get price without login
const response = await fetch('/api/pricing/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: '65abc123...',
    pincode: '560001',
    quantity: 100
  })
});

const data = await response.json();
console.log(data.pricing.totalPayable); // Guest/RETAIL pricing
console.log(data.meta.userSegment); // "RETAIL"
```

### For Logged-In Users
```javascript
// Frontend example - Get personalized price
const token = localStorage.getItem('authToken');

const response = await fetch('/api/pricing/quote', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    productId: '65abc123...',
    pincode: '400001',
    quantity: 100
  })
});

const data = await response.json();
console.log(data.pricing.totalPayable); // User-specific pricing
console.log(data.meta.userSegment); // "VIP", "CORPORATE", etc.
console.log(data.meta.pricingTier); // 0, 1, 2, 3, or 4
```

---

## 📡 API Endpoints

### 1. Get Price Quote (Single Product)

**Endpoint:** `POST /api/pricing/quote`

**Auth:** Optional (Bearer token)

**Request Body:**
```json
{
  "productId": "65abc123...",
  "pincode": "560001",
  "quantity": 100,
  "selectedDynamicAttributes": [
    {
      "attributeType": "SIZE",
      "value": "A4",
      "pricingKey": "paper_size"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "pricing": {
    "basePrice": 5000,
    "compareAtPrice": 6000,
    "quantity": 100,
    "subtotal": 495000,
    "gstPercentage": 18,
    "gstAmount": 89100,
    "totalPayable": 584100,
    "currency": "INR"
  },
  "meta": {
    "geoZone": "South India",
    "modifiersApplied": 3,
    "calculatedAt": "2026-01-06T05:29:37.000Z",
    "userSegment": "VIP",
    "pricingTier": 1,
    "isAuthenticated": true
  }
}
```

---

### 2. Get Batch Quotes (Multiple Products)

**Endpoint:** `POST /api/pricing/batch-quote`

**Auth:** Optional

**Use Case:** Product listing pages, cart calculations

**Request Body:**
```json
{
  "productIds": ["id1", "id2", "id3"],
  "pincode": "560001",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "prices": [
    {
      "productId": "id1",
      "success": true,
      "basePrice": 1000,
      "compareAtPrice": 1200,
      "totalPayable": 1180,
      "currency": "INR",
      "modifiersApplied": 2
    },
    {
      "productId": "id2",
      "success": true,
      "basePrice": 2000,
      "compareAtPrice": 2500,
      "totalPayable": 2360,
      "currency": "INR",
      "modifiersApplied": 1
    }
  ],
  "context": {
    "userSegment": "CORPORATE",
    "pricingTier": 2,
    "geoZone": "South India"
  }
}
```

---

### 3. Get My Pricing Context

**Endpoint:** `GET /api/pricing/my-context?pincode=560001`

**Auth:** Optional

**Use Case:** Display user badges, tier information

**Response:**
```json
{
  "success": true,
  "context": {
    "isAuthenticated": true,
    "userSegment": {
      "code": "VIP",
      "name": "VIP Member"
    },
    "userType": "customer",
    "pricingTier": 1,
    "geoZone": {
      "name": "South India",
      "pincode": "560001"
    },
    "paymentTerms": "NET30",
    "creditLimit": 100000
  }
}
```

**For Guest Users:**
```json
{
  "success": true,
  "context": {
    "isAuthenticated": false,
    "userSegment": {
      "code": "RETAIL",
      "name": "Retail Customer"
    },
    "userType": "guest",
    "pricingTier": 0,
    "geoZone": null,
    "paymentTerms": "PREPAID",
    "creditLimit": 0
  }
}
```

---

### 4. Get Price Breakdown

**Endpoint:** `POST /api/pricing/breakdown`

**Auth:** Optional

**Use Case:** Transparency modal, showing how price is calculated

**Request:** Same as `/quote`

**Response:**
```json
{
  "success": true,
  "breakdown": [
    {
      "label": "Base Price",
      "amount": 5000,
      "type": "base"
    },
    {
      "label": "PRODUCT Modifier: VIP Discount",
      "amount": -500,
      "type": "modifier",
      "modifierType": "PERCENTAGE"
    },
    {
      "label": "GEO_ZONE Modifier: South India Surcharge",
      "amount": 200,
      "type": "modifier",
      "modifierType": "FIXED_AMOUNT"
    },
    {
      "label": "Subtotal (100x)",
      "amount": 495000,
      "type": "subtotal"
    },
    {
      "label": "GST (18%)",
      "amount": 89100,
      "type": "gst"
    },
    {
      "label": "Total Payable",
      "amount": 584100,
      "type": "total"
    }
  ],
  "currency": "INR",
  "totalPayable": 584100
}
```

---

## 🔄 How It Works

### User Context Resolution Flow

```
1. User makes request to /quote
   ↓
2. optionalAuthMiddleware runs
   ├─ Token present? → Extract user
   └─ No token? → req.user = null
   ↓
3. pricingContextMiddleware runs
   ├─ Build context from req.user
   ├─ Get pincode from body/query/profile
   ├─ Resolve geo zone from pincode
   └─ Attach to req.pricingContext
   ↓
4. Controller receives request
   ├─ Extract userId (or null for guests)
   ├─ Call PricingService.resolvePrice()
   └─ Return pricing with context metadata
```

### Context Properties

The pricing context includes:

```javascript
{
  userId: ObjectId | null,
  userSegmentId: ObjectId,
  userSegmentCode: "RETAIL" | "VIP" | "CORPORATE" | "WHOLESALE",
  userSegmentName: "Retail Customer",
  userTypeId: ObjectId | null,
  userType: "customer" | "print partner" | "corporate" | "guest",
  pricingTier: 0-4,  // Higher tier = better pricing
  territoryAccess: ["560*", "400*"],  // Pincode patterns
  pincode: "560001",
  geoZoneId: ObjectId | null,
  geoZoneName: "South India",
  creditLimit: 100000,
  paymentTerms: "NET30" | "PREPAID" | "COD",
  isAuthenticated: true | false
}
```

---

## 🎨 Frontend Integration Examples

### Example 1: Product Card Component

```jsx
import { useState, useEffect } from 'react';

const ProductCard = ({ product }) => {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPrice();
  }, [product.id]);
  
  const fetchPrice = async () => {
    const token = localStorage.getItem('authToken');
    const userPincode = localStorage.getItem('pincode') || '560001';
    
    const response = await fetch('/api/pricing/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        productId: product.id,
        pincode: userPincode,
        quantity: 1
      })
    });
    
    const data = await response.json();
    setPrice(data.pricing);
    setLoading(false);
  };
  
  if (loading) return <div>Loading price...</div>;
  
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      
      <div className="price-section">
        {price.compareAtPrice > price.totalPayable && (
          <span className="original-price">
            ₹{price.compareAtPrice}
          </span>
        )}
        <span className="final-price">
          ₹{price.totalPayable}
        </span>
        
        {price.compareAtPrice > price.totalPayable && (
          <span className="discount-badge">
            {Math.round((1 - price.totalPayable/price.compareAtPrice) * 100)}% OFF
          </span>
        )}
      </div>
    </div>
  );
};
```

### Example 2: Product Listing with Batch Pricing

```jsx
const ProductListing = ({ products }) => {
  const [prices, setPrices] = useState({});
  
  useEffect(() => {
    fetchBatchPrices();
  }, [products]);
  
  const fetchBatchPrices = async () => {
    const token = localStorage.getItem('authToken');
    const pincode = localStorage.getItem('pincode') || '560001';
    
    const productIds = products.map(p => p.id);
    
    const response = await fetch('/api/pricing/batch-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        productIds,
        pincode,
        quantity: 1
      })
    });
    
    const data = await response.json();
    
    // Convert array to object for easy lookup
    const priceMap = {};
    data.prices.forEach(p => {
      priceMap[p.productId] = p;
    });
    
    setPrices(priceMap);
  };
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard 
          key={product.id}
          product={product}
          price={prices[product.id]}
        />
      ))}
    </div>
  );
};
```

### Example 3: User Context Badge

```jsx
const UserContextBadge = () => {
  const [context, setContext] = useState(null);
  
  useEffect(() => {
    fetchContext();
  }, []);
  
  const fetchContext = async () => {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch('/api/pricing/my-context', {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    const data = await response.json();
    setContext(data.context);
  };
  
  if (!context) return null;
  
  return (
    <div className="user-badge">
      {context.isAuthenticated ? (
        <>
          <span className={`segment-badge ${context.userSegment.code.toLowerCase()}`}>
            {context.userSegment.name}
          </span>
          {context.pricingTier > 0 && (
            <span className="tier-badge">
              Tier {context.pricingTier} Pricing
            </span>
          )}
        </>
      ) : (
        <span className="guest-badge">Guest Pricing</span>
      )}
    </div>
  );
};
```

### Example 4: Pincode Selector

```jsx
const PincodeSelector = ({ onPincodeChange }) => {
  const [pincode, setPincode] = useState(
    localStorage.getItem('pincode') || ''
  );
  const [geoZone, setGeoZone] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate pincode (basic check)
    if (!/^\d{6}$/.test(pincode)) {
      alert('Please enter a valid 6-digit pincode');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('pincode', pincode);
    
    // Get geo zone info
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/pricing/my-context?pincode=${pincode}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    const data = await response.json();
    setGeoZone(data.context.geoZone);
    
    // Notify parent to refresh prices
    onPincodeChange(pincode);
  };
  
  return (
    <div className="pincode-selector">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="Enter pincode"
          maxLength={6}
        />
        <button type="submit">Update</button>
      </form>
      
      {geoZone && (
        <div className="geo-info">
          📍 Prices for {geoZone.name}
        </div>
      )}
    </div>
  );
};
```

---

## 🧪 Testing Examples

### Test 1: Guest User Gets RETAIL Pricing

```bash
curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "pincode": "560001",
    "quantity": 100
  }'
```

**Expected:** Response shows `"userSegment": "RETAIL"` in meta

---

### Test 2: VIP User Gets Discounted Pricing

```bash
# First login as VIP user to get token
TOKEN="YOUR_VIP_USER_TOKEN"

curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": "SAME_PRODUCT_ID",
    "pincode": "560001",
    "quantity": 100
  }'
```

**Expected:** Lower price with `"userSegment": "VIP"` in meta

---

### Test 3: Different Geo Zones Get Different Prices

```bash
# Mumbai
curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "pincode": "400001",
    "quantity": 100
  }'

# Bangalore
curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "pincode": "560001",
    "quantity": 100
  }'
```

**Expected:** Different `geoZone` in response, potentially different prices

---

### Test 4: Batch Pricing

```bash
curl -X POST http://localhost:5000/api/pricing/batch-quote \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["PROD_ID_1", "PROD_ID_2", "PROD_ID_3"],
    "pincode": "560001",
    "quantity": 1
  }'
```

---

### Test 5: Check Redis Caching

```bash
# First request (cache miss)
curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "pincode": "560001",
    "quantity": 1
  }'

# Check Redis
docker exec pricing-redis redis-cli KEYS 'PRICE::*'

# Second request (cache hit - should be faster)
# Run same curl command again
```

---

## 📊 User Scenarios

### Scenario 1: Retail Customer in Bangalore
- **Segment:** RETAIL
- **Tier:** 0
- **Location:** Bangalore (560001)
- **Price:** Base price + Bangalore zone modifiers

### Scenario 2: VIP Customer in Mumbai
- **Segment:** VIP
- **Tier:** 1
- **Location:** Mumbai (400001)
- **Price:** Base price - VIP discount (15%) + Mumbai zone modifiers

### Scenario 3: Corporate Customer in Delhi
- **Segment:** CORPORATE
- **Tier:** 2
- **Location:** Delhi (110001)
- **Price:** Base price - Corporate discount (20%) + Delhi zone modifiers

### Scenario 4: Print Partner
- **Segment:** PARTNER
- **Tier:** 3
- **Territory:** Karnataka only (560*)
- **Price:** Special partner pricing + no shipping

---

## 🚀 Performance Tips

1. **Use Batch Pricing:** For product listings, use `/batch-quote` instead of multiple `/quote` calls
2. **Cache Pincode:** Store user's pincode in localStorage to avoid repeated entry
3. **Redis Caching:** Prices are cached for 15 minutes, subsequent requests are instant
4. **Parallel Requests:** Batch endpoint processes all products in parallel

---

## 🔧 Troubleshooting

### Issue: Getting RETAIL prices even when logged in

**Solution:** Check if Authorization header is being sent:
```javascript
headers: {
  'Authorization': `Bearer ${token}` // Make sure token is valid
}
```

### Issue: Price not updating after pincode change

**Solution:** Make sure to pass new pincode in request body:
```javascript
body: JSON.stringify({
  productId,
  pincode: newPincode, // Updated pincode
  quantity
})
```

### Issue: Different price on refresh

**Solution:** This is expected if modifiers or cache expired. Prices are cached for 15 minutes.

---

## 📝 Summary

✅ **Guest users** automatically get RETAIL segment pricing
✅ **Logged-in users** get personalized pricing based on their segment and tier
✅ **Different locations** get different prices via geo zone modifiers
✅ **Batch pricing** available for product listings
✅ **Context API** available to display user badges and tier info
✅ **All endpoints** work with or without authentication
✅ **Redis caching** ensures fast performance

Your dynamic pricing system is now fully operational! 🎉
