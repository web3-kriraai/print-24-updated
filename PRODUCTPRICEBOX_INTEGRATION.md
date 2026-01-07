# Integration Guide: Adding ProductPriceBox to GlossProductSelection.tsx

## Step 1: Add Import at the Top

**Location:** Line 1-10 (with other imports)

```tsx
import ProductPriceBox from '../components/ProductPriceBox';
```

Add this after the existing imports, around line 8.

---

## Step 2: Find the Order Summary Section

**Location:** Around line 3142-3200

Look for this section:
```tsx
{/* Compact Order Summary - shown when a product is selected */}
<div className="...">
  <h3 className="...">Order Summary</h3>
  ...
</div>
```

---

## Step 3: Replace Price Display

**Find this section** (around line 3150-3180):
```tsx
<div className="space-y-2 text-sm">
  <div className="flex justify-between">
    <span>Base Price:</span>
    <span>₹{selectedProduct.basePrice}</span>
  </div>
  {/* Other price breakdowns */}
</div>
```

**Replace with:**
```tsx
{/* Dynamic Pricing Component */}
<ProductPriceBox
  productId={selectedProduct._id}
  quantity={quantity}
  selectedDynamicAttributes={Object.entries(selectedDynamicAttributes).map(([key, value]) => ({
    attributeType: key,
    value: value
  }))}
  showBreakdown={true}
/>
```

---

## Complete Code to Add

Here's the exact code to add to `GlossProductSelection.tsx`:

### 1. Import (Top of file, around line 8)
```tsx
import ProductPriceBox from '../components/ProductPriceBox';
```

### 2. In the Order Summary section (around line 3150)

**BEFORE:**
```tsx
<div className="bg-white rounded-lg shadow-sm p-4">
  <h3 className="text-lg font-semibold mb-3">
    Order Summary
  </h3>
  <div className="space-y-2 text-sm">
    {/* Old static price display */}
  </div>
</div>
```

**AFTER:**
```tsx
<div className="bg-white rounded-lg shadow-sm p-4">
  <h3 className="text-lg font-semibold mb-3">
    Order Summary
  </h3>
  
  {/* Dynamic Pricing - Shows different prices for different users */}
  <ProductPriceBox
    productId={selectedProduct._id}
    quantity={quantity}
    selectedDynamicAttributes={Object.entries(selectedDynamicAttributes)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        attributeType: key,
        value: typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)
          ? JSON.stringify(value)
          : value
      }))}
    showBreakdown={true}
  />
</div>
```

---

## What This Does

1. **Removes static basePrice display**
2. **Adds ProductPriceBox component** that:
   - Fetches price from `/api/pricing/quote`
   - Shows different prices for different users
   - Displays user badges (VIP, CORPORATE, PARTNER, etc.)
   - Shows price breakdown
   - Handles GST calculation
   - Shows savings amount

3. **Passes selected attributes** so price updates when user changes:
   - Quantity
   - Paper type
   - Size
   - Any other dynamic attributes

---

## Expected Result

### Guest User:
```
💰 Dynamic Pricing Enabled
👤 GUEST PRICING

₹1,180
for 1000 units
```

### Print Partner (You):
```
💰 Dynamic Pricing Enabled
🤝 PARTNER PRICING

Original: ₹1,180
Your Price: ₹1,062
You save ₹118!

for 1000 units
```

### Corporate User:
```
💰 Dynamic Pricing Enabled
⚡ TIER 2 / CORPORATE

Original: ₹1,180
Your Price: ₹944
You save ₹236!

for 1000 units
```

---

## Testing After Integration

1. **Save the file**
2. **Refresh browser** (Ctrl+R or Cmd+R)
3. **Go to any product page**
4. **You should see:**
   - "🤝 PARTNER PRICING" badge
   - Lower price than guest users
   - "You save ₹XXX" message
   - Price breakdown button

5. **Test with different users:**
   - Logout
   - Login as corporate@gmail.com
   - See even lower price
   - Logout
   - Browse as guest
   - See highest price

---

## Exact Line Numbers

I'll now find the exact lines and make the changes for you!
