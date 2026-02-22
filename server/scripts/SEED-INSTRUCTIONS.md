# Seed Script Instructions

## Overview
This seed script populates your database with:
- 5 Attributes (Paper GSM, Paper Color, Lamination, Texture, UV)
- 4 Sub-Attributes (UV Area options, Texture Pattern options)
- 1 Product (Premium Visiting Cards)
- 4 Attribute Rules (IF-THEN logic)

## Prerequisites
1. Make sure your `.env` file has `MONGO_URI` set
2. Ensure MongoDB is running and accessible
3. Node.js and npm installed

## Running the Seed Script

### Option 1: Using npm script (Recommended)
```bash
cd server
npm run seed:visiting-cards
```

### Option 2: Direct node command
```bash
cd server
node scripts/seed-visiting-cards.js
```

## What Gets Created

### Attributes
1. **Paper GSM** - Dropdown with 300, 350, 400 GSM options
2. **Paper Color** - Dropdown with White, Ivory, Brown Kraft
3. **Lamination** - Radio buttons: None, Gloss, Matte
4. **Texture** - Popup: None, Linen (with sub-attributes)
5. **UV** - Radio buttons: None, Spot UV (with sub-attributes)

### Sub-Attributes
1. **UV Area** (when UV = Spot UV):
   - Logo Only
   - Full Card

2. **Texture Pattern** (when Texture = Linen):
   - Soft Linen
   - Hard Linen

### Product
- **Premium Visiting Cards**
  - Base Price: ₹2.5 per unit
  - GST: 18%
  - Includes all 5 attributes

### Rules
1. **Hide UV for 300 GSM** - When Paper GSM = 300, hide UV attribute
2. **Default Spot UV for 400 GSM** - When Paper GSM = 400, auto-select Spot UV
3. **Hide Texture on Matte Lamination** - When Lamination = Matte, hide Texture
4. **Restrict Lamination for Spot UV** - When UV = Spot UV, show only Gloss/Matte lamination

## Testing Checklist

After seeding, verify:
- ✅ Product page shows all 5 attributes
- ✅ Selecting 400 GSM auto-selects Spot UV
- ✅ Selecting 300 GSM hides UV attribute
- ✅ Selecting Spot UV shows sub-attribute "UV Area"
- ✅ Selecting Matte Lamination hides Texture attribute
- ✅ Price updates dynamically based on selections

## Notes
- The script is **idempotent** - it won't create duplicates if run multiple times
- It will use existing categories/subcategories if found
- Existing attributes/rules with the same name will be reused
