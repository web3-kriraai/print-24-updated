# 🎯 Dynamic Pricing Setup Guide

## Current Status ✅

**What's Already Done:**
- ✅ Backend API endpoints ready (`/api/pricing/quote`)
- ✅ UserContextService (builds pricing context)
- ✅ PricingContextMiddleware (handles auth)
- ✅ React components created (PriceDisplay, PincodeSelector)
- ✅ Server running successfully
- ✅ Existing ProductPriceBox component found

**What You Need to Do:**
1. Set up base prices in database
2. Create price modifiers for user segments
3. Replace ProductPriceBox with new PriceDisplay
4. Test with different users

---

## Step 1: Set Up Base Prices (Admin Panel)

### Option A: Using Your Admin Dashboard

1. Go to **Admin Dashboard** → **Pricing** → **Price Books**
2. Create a "Master Price Book" for each product
3. Set base prices for each product

**Example:**
```
Product: Business Cards (1000 qty)
Base Price: ₹5,000
GST: 18%
```

### Option B: Direct Database Setup (Quick Test)

```javascript
// Run this in MongoDB or via API
db.products.updateOne(
  { _id: ObjectId("YOUR_PRODUCT_ID") },
  { 
    $set: { 
      basePrice: 5000,  // Base price for RETAIL users
      gstPercentage: 18
    }
  }
);
```

---

## Step 2: Create Price Modifiers for User Segments

### Go to Admin → Pricing → Modifiers

Create these modifiers:

### 1. VIP Discount (15% off)
```json
{
  "name": "VIP Member Discount",
  "modifierType": "PERCENTAGE",
  "value": -15,
  "scope": "SEGMENT",
  "applicableSegments": ["VIP"],
  "stackable": true,
  "priority": 10,
  "isActive": true
}
```

### 2. Corporate Discount (20% off)
```json
{
  "name": "Corporate Bulk Discount",
  "modifierType": "PERCENTAGE",
  "value": -20,
  "scope": "SEGMENT",
  "applicableSegments": ["CORPORATE"],
  "stackable": true,
  "priority": 10,
  "isActive": true
}
```

### 3. Mumbai Zone Surcharge (+₹200)
```json
{
  "name": "Mumbai Delivery Surcharge",
  "modifierType": "FIXED_AMOUNT",
  "value": 200,
  "scope": "ZONE",
  "applicableGeoZones": ["Mumbai"],
  "stackable": true,
  "priority": 5,
  "isActive": true
}
```

### 4. Bangalore Zone Discount (-₹100)
```json
{
  "name": "South India Discount",
  "modifierType": "FIXED_AMOUNT",
  "value": -100,
  "scope": "ZONE",
  "applicableGeoZones": ["South India"],
  "stackable": true,
  "priority": 5,
  "isActive": true
}
```

---

## Step 3: Update ProductPriceBox Component

Replace your current `ProductPriceBox.tsx` with the new dynamic pricing version:

### File: `/client/components/ProductPriceBox.tsx`

```typescript
import { useEffect, useState } from 'react';

interface ProductPriceBoxProps {
  productId: string;
  quantity?: number;
  selectedDynamicAttributes?: any[];
  showBreakdown?: boolean;
}

interface PricingData {
  basePrice: number;
  compareAtPrice: number;
  totalPayable: number;
  subtotal: number;
  gstAmount: number;
  gstPercentage: number;
  appliedModifiers: any[];
  currency: string;
}

interface PricingMeta {
  userSegment: string;
  pricingTier: number;
  isAuthenticated: boolean;
  geoZone: string;
  modifiersApplied: number;
}

export default function ProductPriceBox({
  productId,
  quantity = 1,
  selectedDynamicAttributes = [],
  showBreakdown = false
}: ProductPriceBoxProps) {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [meta, setMeta] = useState<PricingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDynamicPricing = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get auth token if exists
        const token = localStorage.getItem('authToken');
        
        // Get pincode from localStorage or use default
        const pincode = localStorage.getItem('pincode') || '560001';

        const headers: any = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/pricing/quote', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId,
            pincode,
            selectedDynamicAttributes,
            quantity,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pricing');
        }

        const data = await response.json();
        
        if (data.success) {
          setPricing(data.pricing);
          setMeta(data.meta);
        } else {
          setError(data.message || 'Failed to calculate price');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
        console.error('Dynamic pricing error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchDynamicPricing();
    }
  }, [productId, JSON.stringify(selectedDynamicAttributes), quantity]);

  if (loading) {
    return (
      <div className="price-box loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-box error bg-red-50 p-4 rounded">
        <p className="text-red-600">⚠️ {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!pricing) {
    return null;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: pricing.currency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasDiscount = pricing.compareAtPrice > pricing.totalPayable;
  const discountAmount = hasDiscount ? pricing.compareAtPrice - pricing.totalPayable : 0;
  const discountPercent = hasDiscount 
    ? Math.round((discountAmount / pricing.compareAtPrice) * 100) 
    : 0;

  return (
    <div className="price-box bg-white p-6 rounded-lg shadow-sm">
      {/* User Segment Badges */}
      {meta && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {meta.userSegment === 'VIP' && (
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
              👑 VIP PRICE
            </span>
          )}
          {meta.pricingTier >= 2 && (
            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-xs font-bold rounded-full">
              ⚡ TIER {meta.pricingTier}
            </span>
          )}
          {meta.geoZone && (
            <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-700 text-white text-xs font-bold rounded-full">
              📍 {meta.geoZone}
            </span>
          )}
          {!meta.isAuthenticated && (
            <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
              👤 GUEST PRICING
            </span>
          )}
        </div>
      )}

      {/* Original Price (if discount) */}
      {hasDiscount && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-500 line-through text-lg">
            {formatPrice(pricing.compareAtPrice)}
          </span>
          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
            -{discountPercent}%
          </span>
        </div>
      )}

      {/* Final Price */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-gray-900">
          {formatPrice(pricing.totalPayable)}
        </span>
        {quantity > 1 && (
          <span className="text-sm text-gray-600">
            for {quantity} units
          </span>
        )}
      </div>

      {/* Savings */}
      {hasDiscount && discountAmount > 0 && (
        <div className="text-green-600 font-semibold mb-4">
          You save {formatPrice(discountAmount)}!
        </div>
      )}

      {/* Price Breakdown (Optional) */}
      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price:</span>
              <span className="font-medium">{formatPrice(pricing.basePrice)}</span>
            </div>

            {pricing.appliedModifiers && pricing.appliedModifiers.length > 0 && (
              <div className="space-y-1">
                {pricing.appliedModifiers.map((mod: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-500">{mod.reason || mod.source}:</span>
                    <span className={mod.value < 0 ? 'text-green-600' : 'text-orange-600'}>
                      {mod.value < 0 ? '' : '+'}{mod.value}
                      {mod.modifierType?.includes('PERCENT') ? '%' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatPrice(pricing.subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">GST ({pricing.gstPercentage}%):</span>
              <span className="font-medium">{formatPrice(pricing.gstAmount)}</span>
            </div>

            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
              <span>Total Payable:</span>
              <span className="text-lg">{formatPrice(pricing.totalPayable)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && meta && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div>Segment: {meta.userSegment} | Tier: {meta.pricingTier}</div>
          <div>Auth: {meta.isAuthenticated ? 'Yes' : 'No'} | Modifiers: {meta.modifiersApplied}</div>
        </div>
      )}
    </div>
  );
}
```

---

## Step 4: Use in Your Product Pages

### Example: In GlossProductSelection.tsx or VisitingCards.tsx

```typescript
import ProductPriceBox from '../components/ProductPriceBox';

// Inside your product detail view:
<ProductPriceBox 
  productId={selectedProduct._id}
  quantity={quantity}
  selectedDynamicAttributes={selectedAttributes}
  showBreakdown={true}
/>
```

---

## Step 5: Set Up User Segments

### Create User Segments in Admin Panel

Go to **Admin → Pricing → User Segments** and create:

1. **RETAIL** (Default)
   - Code: `RETAIL`
   - Name: `Retail Customer`
   - Is Default: ✅ Yes

2. **VIP**
   - Code: `VIP`
   - Name: `VIP Member`
   - Is Default: ❌ No

3. **CORPORATE**
   - Code: `CORPORATE`
   - Name: `Corporate Client`
   - Is Default: ❌ No

### Assign Users to Segments

```javascript
// Update user to VIP segment
db.users.updateOne(
  { email: "vip@example.com" },
  { 
    $set: { 
      userSegment: ObjectId("VIP_SEGMENT_ID"),
      pricingTier: 1
    }
  }
);

// Update user to CORPORATE segment
db.users.updateOne(
  { email: "corporate@example.com" },
  { 
    $set: { 
      userSegment: ObjectId("CORPORATE_SEGMENT_ID"),
      pricingTier: 2
    }
  }
);
```

---

## Step 6: Set Up Geo Zones

### Create Geo Zones in Admin Panel

Go to **Admin → Pricing → Geo Zones** and create:

1. **South India**
   - Name: `South India`
   - Code: `SOUTH_INDIA`
   - Pincodes: `560*` (Bangalore), `600*` (Chennai)

2. **Mumbai**
   - Name: `Mumbai`
   - Code: `MUMBAI`
   - Pincodes: `400*`

3. **Delhi NCR**
   - Name: `Delhi NCR`
   - Code: `DELHI_NCR`
   - Pincodes: `110*`, `122*`

---

## How It Works 🎯

### Scenario 1: Guest User (Not Logged In)
```
Product: Business Cards (1000 qty)
Base Price: ₹5,000
User Segment: RETAIL (default)
Location: Bangalore (560001)

Calculation:
- Base Price: ₹5,000
- South India Discount: -₹100
- Subtotal: ₹4,900
- GST (18%): ₹882
- Total: ₹5,782

Display: "👤 GUEST PRICING" badge
```

### Scenario 2: VIP User
```
Product: Business Cards (1000 qty)
Base Price: ₹5,000
User Segment: VIP
Location: Bangalore (560001)

Calculation:
- Base Price: ₹5,000
- VIP Discount (15%): -₹750
- South India Discount: -₹100
- Subtotal: ₹4,150
- GST (18%): ₹747
- Total: ₹4,897

Display: "👑 VIP PRICE" + "📍 South India" badges
Savings: ₹885 (15% off)
```

### Scenario 3: Corporate User in Mumbai
```
Product: Business Cards (1000 qty)
Base Price: ₹5,000
User Segment: CORPORATE
Location: Mumbai (400001)

Calculation:
- Base Price: ₹5,000
- Corporate Discount (20%): -₹1,000
- Mumbai Surcharge: +₹200
- Subtotal: ₹4,200
- GST (18%): ₹756
- Total: ₹4,956

Display: "⚡ TIER 2" + "📍 Mumbai" badges
Savings: ₹1,026 (17% off)
```

---

## Testing Checklist ✅

### 1. Test Guest User
- [ ] Open product page in incognito mode
- [ ] Should see "GUEST PRICING" badge
- [ ] Price = Base Price + Zone modifiers + GST
- [ ] No VIP/Corporate discounts

### 2. Test VIP User
- [ ] Login as VIP user
- [ ] Should see "VIP PRICE" badge
- [ ] Price should be 15% less than guest
- [ ] Strikethrough showing original price

### 3. Test Corporate User
- [ ] Login as corporate user
- [ ] Should see "TIER 2" badge
- [ ] Price should be 20% less than guest
- [ ] Best pricing overall

### 4. Test Location Changes
- [ ] Change pincode to Mumbai (400001)
- [ ] Price should increase (surcharge)
- [ ] Change to Bangalore (560001)
- [ ] Price should decrease (discount)

---

## Quick Test Commands

### Test API Directly

```bash
# Test Guest Pricing
curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "pincode": "560001",
    "quantity": 1
  }'

# Test VIP Pricing (with token)
curl -X POST http://localhost:5000/api/pricing/quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VIP_TOKEN" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "pincode": "560001",
    "quantity": 1
  }'
```

---

## Troubleshooting

### Issue: All users see same price
**Solution:** Check if modifiers are created and active in database

### Issue: VIP discount not applying
**Solution:** Verify user has `userSegment` field set to VIP segment ID

### Issue: Location doesn't change price
**Solution:** Check if geo zones are created and pincodes are mapped

### Issue: Price shows as ₹0
**Solution:** Ensure product has `basePrice` set in database

---

## Summary

**What You Need:**
1. ✅ Set base prices for products
2. ✅ Create price modifiers (VIP, Corporate, Zone-based)
3. ✅ Create user segments (RETAIL, VIP, CORPORATE)
4. ✅ Create geo zones (South India, Mumbai, Delhi)
5. ✅ Assign users to segments
6. ✅ Replace ProductPriceBox component
7. ✅ Test with different users and locations

**Result:**
- Different users see different prices
- Prices change based on location
- Automatic discounts for VIP/Corporate
- Visual badges showing pricing context
- Complete price transparency

Your dynamic pricing system is ready! 🚀
