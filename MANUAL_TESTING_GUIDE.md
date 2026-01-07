# 🧪 Manual Testing Guide - Dynamic Pricing

## Test Accounts Provided

1. **Corporate User**
   - Email: `corporate@gmail.com`
   - Password: `naren123`
   - Expected: Corporate pricing (lowest prices)

2. **Print Partner**
   - Email: `printpartner@gmail.com`
   - Password: `naren123`
   - Expected: Partner pricing

---

## Step-by-Step Testing Instructions

### Test 1: Guest User (Not Logged In)

1. **Open browser in Incognito/Private mode**
   ```
   http://localhost:3000
   ```

2. **Navigate to any product**
   - Click on a product from the homepage
   - Or go directly to a product page

3. **Check the price shown**
   - Should show "👤 GUEST PRICING" badge
   - Should show RETAIL segment price
   - No VIP or corporate discounts

4. **Take note of the price**
   - Example: ₹1,180

---

### Test 2: Corporate User

1. **Click "Login" or "Sign In"**

2. **Enter credentials:**
   - Email: `corporate@gmail.com`
   - Password: `naren123`

3. **After login, go to the SAME product**

4. **Check the price shown**
   - Should show different price than guest
   - Should show "⚡ TIER" or "CORPORATE" badge
   - Should show strikethrough on original price
   - Should show "You save ₹XXX"

5. **Compare:**
   - Guest price: ₹1,180
   - Corporate price: ₹944 (example)
   - Savings: ₹236

---

### Test 3: Print Partner User

1. **Logout from corporate account**

2. **Login with:**
   - Email: `printpartner@gmail.com`
   - Password: `naren123`

3. **Go to the SAME product again**

4. **Check the price**
   - Should show different price than both guest and corporate
   - Should show appropriate badge
   - Should show savings if applicable

---

## What to Look For

### Price Display Should Show:

✅ **Different prices for different users**
- Guest: Highest price (RETAIL)
- Corporate: Lower price (corporate discount)
- Print Partner: Partner-specific price

✅ **Visual Indicators:**
- Badges showing user type
- Strikethrough on original price
- Savings amount highlighted
- "You save ₹XXX" message

✅ **Price Breakdown:**
- Click "How is this price calculated?"
- Should show:
  - Base price
  - Applied modifiers
  - User segment
  - GST calculation
  - Total

---

## Current Status

### ✅ What's Ready:
- Backend API endpoints working
- User authentication working
- Price calculation engine working
- React components created

### ⚠️ What Needs Integration:
Your product detail page needs to use the `ProductPriceBox` component instead of showing static prices.

---

## Quick Integration

### Find Your Product Detail Component

Look for files like:
- `GlossProductSelection.tsx`
- `VisitingCards.tsx`
- `ProductDetail.tsx`
- Or any page showing product details

### Replace Static Price with Dynamic Price

**Current (Static):**
```tsx
<div className="price">
  ₹{product.basePrice}
</div>
```

**New (Dynamic):**
```tsx
import ProductPriceBox from '../components/ProductPriceBox';

<ProductPriceBox
  productId={product._id}
  quantity={selectedQuantity || 1}
  selectedDynamicAttributes={selectedAttributes}
  showBreakdown={true}
/>
```

---

## Testing Checklist

### Before Testing:
- [ ] Server running (`npm start` in server folder)
- [ ] Client running (`npm run dev` in client folder)
- [ ] Product detail page uses `ProductPriceBox` component
- [ ] At least one product has prices set in Price Books

### During Testing:
- [ ] Guest user sees RETAIL price
- [ ] Corporate user sees lower price
- [ ] Print partner sees partner price
- [ ] Prices are different for each user type
- [ ] Badges display correctly
- [ ] Price breakdown modal works
- [ ] Savings amount is correct

### After Testing:
- [ ] Logout works correctly
- [ ] Switching users updates price
- [ ] No console errors
- [ ] Price updates when changing quantity
- [ ] Price updates when changing attributes

---

## Troubleshooting

### Issue: All users see same price
**Solution:**
1. Check if users have `userSegment` assigned in database
2. Verify Price Books have entries for different segments
3. Check if modifiers are active

### Issue: Price shows as ₹0
**Solution:**
1. Ensure product has price set in Price Books
2. Check if Price Book entry is active
3. Verify product ID is correct

### Issue: "Price unavailable" error
**Solution:**
1. Check server console for errors
2. Verify API endpoint is working: `POST /api/pricing/quote`
3. Check network tab in browser DevTools

---

## Expected Results

### Guest User:
```
Product: Business Cards (1000 qty)
Price: ₹1,180
Badge: 👤 GUEST PRICING
Segment: RETAIL
```

### Corporate User:
```
Product: Business Cards (1000 qty)
Original Price: ₹1,180 (strikethrough)
Your Price: ₹944
Badge: ⚡ CORPORATE / TIER 2
You save: ₹236 (20% off)
Segment: CORPORATE
```

### Print Partner:
```
Product: Business Cards (1000 qty)
Original Price: ₹1,180 (strikethrough)
Your Price: ₹1,062
Badge: 🤝 PARTNER PRICING
You save: ₹118 (10% off)
Segment: PRINT_PARTNER
```

---

## Next Steps

1. **Find your product detail page file**
2. **Replace static price with ProductPriceBox**
3. **Test with the accounts provided**
4. **Verify different prices show for different users**
5. **Check price breakdown modal**

---

## Need Help?

If you need help finding or updating your product detail page:
1. Tell me which page shows product details
2. I'll help integrate the ProductPriceBox component
3. We'll test together with your accounts

**Files to check:**
- `client/pages/GlossProductSelection.tsx`
- `client/pages/VisitingCards.tsx`
- `client/components/ProductCard.tsx`
- Any file that displays product information
