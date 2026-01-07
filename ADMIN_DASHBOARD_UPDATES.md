# Admin Dashboard Updates for Dynamic Pricing

## Summary of Required Changes

Your admin dashboard currently has `basePrice` fields in the product form. Since you're now using **dynamic pricing** (prices set via Price Books and Modifiers), you need to:

1. ✅ **Remove** `basePrice` from product creation form
2. ✅ **Keep** GST percentage (needed for tax calculation)
3. ✅ **Keep** attributes and sub-attributes (needed for pricing variations)
4. ✅ **Update** product display to show "Set price in Price Books" message

---

## Changes Needed in AdminDashboard.tsx

### 1. Product Interface (Line 79-91)
**Current:**
```typescript
interface Product {
  _id: string;
  name: string;
  description: string;
  basePrice: number;  // ❌ REMOVE THIS
  category?: string | { _id: string; name: string };
  // ...
}
```

**Change to:**
```typescript
interface Product {
  _id: string;
  name: string;
  description: string;
  // basePrice removed - prices managed in Price Books
  category?: string | { _id: string; name: string };
  // ...
}
```

### 2. Product Form State (Line 460-511)
**Already Correct!** ✅
```typescript
const [productForm, setProductForm] = useState({
  name: "",
  description: "",
  // ❌ basePrice REMOVED - Prices are set in Price Books
  category: "",
  // ...
});
```

### 3. Remove basePrice Input Field (Line 7306-7334)
**Find and DELETE this entire section:**
```typescript
{/* Base Price Input - DELETE THIS ENTIRE BLOCK */}
<div>
  <label htmlFor="product-basePrice">
    Base Price *
  </label>
  <input
    id="product-basePrice"
    name="basePrice"
    type="number"
    value={productForm.basePrice}
    onChange={(e) => {
      setProductForm({
        ...productForm,
        basePrice: e.target.value,
      });
    }}
  />
</div>
```

**Replace with:**
```typescript
{/* Price Management Info */}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
    <div>
      <h4 className="font-semibold text-blue-900 mb-1">
        Dynamic Pricing Enabled
      </h4>
      <p className="text-sm text-blue-700">
        Prices for this product are managed through <strong>Price Books</strong> and <strong>Modifiers</strong>.
        After creating the product, go to the <strong>Pricing</strong> tab to set up prices for different user segments and locations.
      </p>
      <button
        type="button"
        onClick={() => setActiveTab('price-books')}
        className="mt-2 text-sm text-blue-600 underline hover:text-blue-800"
      >
        Go to Price Books →
      </button>
    </div>
  </div>
</div>
```

### 4. Product List Display (Line 7724, 11341, 11894)
**Find these lines showing basePrice:**
```typescript
₹{product.basePrice} per unit
```

**Replace with:**
```typescript
<button
  onClick={() => {
    setActiveTab('price-books');
    // Optionally filter to this product
  }}
  className="text-blue-600 hover:underline text-sm"
>
  Set Price →
</button>
```

---

## Backend API Updates

### 1. Product Controller (server/src/controllers/productController.js)

**Current createProduct function:**
```javascript
export const createProduct = async (req, res) => {
  const { name, description, basePrice, category, ... } = req.body;
  
  // Validation
  if (!basePrice) {
    return res.status(400).json({ message: "Base price is required" });
  }
  
  const product = new Product({
    name,
    description,
    basePrice,  // ❌ REMOVE
    category,
    ...
  });
};
```

**Update to:**
```javascript
export const createProduct = async (req, res) => {
  const { name, description, category, gstPercentage, ... } = req.body;
  
  // basePrice validation removed
  // Prices will be set via Price Books
  
  const product = new Product({
    name,
    description,
    // basePrice removed
    category,
    gstPercentage, // ✅ Keep this for tax calculation
    ...
  });
  
  await product.save();
  
  // ✅ NEW: Create default price book entry
  await createDefaultPriceBookEntry(product._id);
  
  res.status(201).json({ success: true, product });
};

// Helper function to create default price book entry
async function createDefaultPriceBookEntry(productId) {
  const retailSegment = await UserSegment.findOne({ code: 'RETAIL' });
  
  const priceBookEntry = new PriceBookEntry({
    product: productId,
    userSegment: retailSegment._id,
    basePrice: 0, // Admin will set this later
    isActive: false, // Not active until price is set
  });
  
  await priceBookEntry.save();
}
```

### 2. Product Model (server/src/models/productModal.js)

**Current:**
```javascript
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: { type: Number, required: true },  // ❌ REMOVE required
  gstPercentage: { type: Number, default: 18 },
  // ...
});
```

**Update to:**
```javascript
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: { type: Number },  // ✅ Optional (legacy field)
  gstPercentage: { type: Number, default: 18 }, // ✅ Keep this
  // ...
});
```

---

## How Attributes Work with Dynamic Pricing

### Current Flow (Correct! ✅)

1. **Create Attribute Types** (Admin → Attributes)
   - Example: "Paper Type" with values: Matte, Glossy, Premium
   - Example: "Size" with values: A4, A5, Letter

2. **Assign Attributes to Products**
   - When creating/editing product, select which attributes apply
   - Each attribute can have price modifiers

3. **Set Prices in Price Books**
   - Go to Admin → Pricing → Price Books
   - Create entries for each product + user segment combination
   - Set base price (e.g., ₹1000 for RETAIL, ₹850 for VIP)

4. **Create Attribute-Based Modifiers**
   - Go to Admin → Pricing → Modifiers
   - Create modifier: "Glossy Paper adds ₹200"
   - Scope: ATTRIBUTE
   - Condition: When paper_type = "glossy"

5. **Result:**
   ```
   RETAIL User selects:
   - Product: Business Cards
   - Paper: Glossy
   - Size: A4
   
   Calculation:
   - Base Price (RETAIL): ₹1,000
   - Glossy Paper Modifier: +₹200
   - Total: ₹1,200 + GST
   
   VIP User selects same:
   - Base Price (VIP): ₹850
   - Glossy Paper Modifier: +₹200
   - VIP Discount: -15%
   - Total: ₹892.50 + GST
   ```

---

## Sub-Attributes Setup

### Example: Paper Type → Thickness

1. **Create Parent Attribute:**
   - Name: "Paper Type"
   - Values: Matte, Glossy, Premium

2. **Create Sub-Attributes:**
   - Parent: Paper Type = "Glossy"
   - Sub-Attribute: Thickness
   - Values: 250gsm (+₹50), 300gsm (+₹100), 350gsm (+₹150)

3. **Create Pricing Rules:**
   ```javascript
   // In Modifier Rules
   {
     name: "Glossy 300gsm Premium",
     scope: "ATTRIBUTE",
     conditions: {
       paper_type: "glossy",
       thickness: "300gsm"
     },
     priceAdd: 100
   }
   ```

---

## Testing Checklist

### After Making Changes:

1. **Create New Product**
   - [ ] No basePrice field shown
   - [ ] Shows "Set price in Price Books" message
   - [ ] Can still set GST percentage
   - [ ] Can still assign attributes
   - [ ] Product saves successfully

2. **Set Price in Price Book**
   - [ ] Go to Pricing → Price Books
   - [ ] Find newly created product
   - [ ] Set base price for RETAIL segment
   - [ ] Set base price for VIP segment
   - [ ] Save successfully

3. **Create Modifiers**
   - [ ] Go to Pricing → Modifiers
   - [ ] Create VIP discount (15% off)
   - [ ] Create attribute-based modifier (e.g., Glossy +₹200)
   - [ ] Test modifiers apply correctly

4. **Test Frontend**
   - [ ] Product detail page shows dynamic price
   - [ ] Guest user sees RETAIL price
   - [ ] VIP user sees discounted price
   - [ ] Attribute selection updates price
   - [ ] Sub-attribute selection updates price

---

## Migration Script (Optional)

If you have existing products with basePrice, run this to migrate them to Price Books:

```javascript
// server/scripts/migrateToPriceBooks.js
import mongoose from 'mongoose';
import Product from '../src/models/productModal.js';
import UserSegment from '../src/models/UserSegment.js';
import PriceBookEntry from '../src/models/PriceBookEntry.js';

async function migrateToPriceBooks() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const retailSegment = await UserSegment.findOne({ code: 'RETAIL' });
  const products = await Product.find({ basePrice: { $exists: true, $gt: 0 } });
  
  console.log(`Migrating ${products.length} products...`);
  
  for (const product of products) {
    // Check if price book entry already exists
    const existing = await PriceBookEntry.findOne({
      product: product._id,
      userSegment: retailSegment._id
    });
    
    if (!existing) {
      await PriceBookEntry.create({
        product: product._id,
        userSegment: retailSegment._id,
        basePrice: product.basePrice,
        isActive: true
      });
      
      console.log(`✅ Migrated: ${product.name} - ₹${product.basePrice}`);
    }
  }
  
  console.log('Migration complete!');
  process.exit(0);
}

migrateToPriceBooks();
```

Run with:
```bash
cd server
node scripts/migrateToPriceBooks.js
```

---

## Summary

**What to Remove:**
- ❌ basePrice input field from product form UI
- ❌ basePrice validation in backend
- ❌ basePrice display in product lists

**What to Keep:**
- ✅ gstPercentage (needed for tax)
- ✅ Attributes and sub-attributes (needed for variations)
- ✅ All existing pricing infrastructure

**What to Add:**
- ✅ "Set price in Price Books" message in product form
- ✅ Link to Price Books tab
- ✅ Helper function to create default price book entry

**Result:**
- Products created without base price
- Prices managed centrally in Price Books
- Different prices for different user segments
- Attribute-based pricing works correctly
- Sub-attributes add price variations
- Complete dynamic pricing system! 🎉
