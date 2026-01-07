# 📦 Pricing Module - Complete Summary

**Last Updated:** January 6, 2026

This document provides a comprehensive overview of the sophisticated pricing engine implemented in this application.

---

## 🏗️ Architecture Overview

The pricing module follows a **multi-layered architecture**:

```
┌─────────────────────────────────────────────────────┐
│             Controllers (API Layer)                  │
│  - pricingController.js                             │
│  - orderController.js                               │
│  - modifierController.js                            │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│          PricingService (Orchestration)             │
│  - Coordinates pricing flow                         │
│  - Manages Redis caching                            │
│  - Creates price snapshots                          │
└─────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────┬──────────────────────────────┐
│  PricingResolver     │    ModifierEngine            │
│  - Base price lookup │    - Applies modifiers       │
│  - Geo zone matching │    - Stacking rules          │
│  - Attribute pricing │    - Calculation logic       │
└──────────────────────┴──────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              Redis Cache Layer                       │
│  Key: PRICE::{PRODUCT}::{SEGMENT}::{ZONE}          │
│  TTL: 900 seconds (15 minutes)                      │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features Implemented

### 1. Dynamic Pricing Resolution ✅
Multi-dimensional pricing based on:
- **Product** (base prices)
- **User Segment** (RETAIL, WHOLESALE, VIP, etc.)
- **Geographic Zone** (pincode-based)
- **Product Attributes** (size, color, material, etc.)
- **Quantity** (volume-based pricing)

### 2. Modifier Engine ✅

**Types supported:**
- `PERCENTAGE` (e.g., 10% discount)
- `FIXED_AMOUNT` (e.g., ₹100 off)
- `PERCENTAGE_UNIT` (per-unit percentage)
- `FIXED_AMOUNT_UNIT` (per-unit fixed)
- `PERCENTAGE_SUBTOTAL` (on total)
- `FIXED_AMOUNT_SUBTOTAL` (on total)

**Stacking Rules:**
- `STACKABLE`: Can combine with other modifiers
- `NON_STACKABLE`: Exclusive (takes precedence)

**Scopes:**
- Product-level modifiers
- Geo zone modifiers
- User segment modifiers
- Attribute-based modifiers

### 3. Redis Caching ✅
- Smart caching with automatic invalidation
- Cache key format: `PRICE::{productId}::{segmentId}::{zoneId}`
- TTL: 15 minutes
- **Invalidation methods:**
  - By product
  - By user segment
  - By geo zone
  - Complete cache flush

### 4. Price Books (Virtual Pricing) ✅
- Hierarchy-based price lookups
- Support for multiple price books
- Dynamic attribute pricing
- Priority-based resolution

### 5. Immutable Price Snapshots ✅
- Order prices locked at order creation
- Full audit trail via `PricingCalculationLog`
- Prevents retroactive price changes
- Historical pricing preserved

### 6. GST Calculation ✅
- Automatic tax calculation
- Product-level GST percentage
- Applied after all modifiers

---

## 📂 Key Components

### Services
```
src/services/pricing/
├── PricingService.js          # Main orchestrator
├── PricingResolver.js         # Base price + context resolution
├── ModifierEngine.js          # Modifier application logic
└── VirtualPriceBookService.js # Price book management
```

### Models
```
src/models/
├── Product.js                  # Product base data
├── PriceBook.js               # Virtual price books
├── PriceModifier.js           # Discount/surcharge rules
├── UserSegment.js             # Customer segments
├── GeoZone.js                 # Geographic pricing zones
├── PricingCalculationLog.js   # Audit trail
└── AttributeType.js           # Dynamic attributes
```

### Controllers
```
src/controllers/
├── pricingController.js       # Public pricing APIs
├── orderController.js         # Order price snapshots
└── modifierController.js      # Admin modifier management
```

### Configuration
```
src/config/
└── redis.js                   # Redis client + PricingCache helper
```

---

## 🔌 API Endpoints

### Public Endpoints

#### Get Price Quote
```http
POST /api/pricing/quote
Content-Type: application/json

{
  "productId": "65abc123...",
  "pincode": "560001",
  "selectedDynamicAttributes": [
    {
      "attributeType": "SIZE",
      "value": "A4",
      "pricingKey": "paper_size"
    }
  ],
  "quantity": 100
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
    "calculatedAt": "2026-01-05T18:26:59.000Z"
  }
}
```

#### Get Price Breakdown (Detailed)
```http
POST /api/pricing/breakdown
Content-Type: application/json

{
  "productId": "65abc123...",
  "pincode": "560001",
  "quantity": 100
}
```

**Response:**
```json
{
  "success": true,
  "breakdown": [
    { "label": "Base Price", "amount": 5000, "type": "base" },
    { "label": "PRODUCT Modifier: VIP Discount", "amount": -500, "type": "modifier" },
    { "label": "Subtotal (100x)", "amount": 495000, "type": "subtotal" },
    { "label": "GST (18%)", "amount": 89100, "type": "gst" },
    { "label": "Total Payable", "amount": 584100, "type": "total" }
  ],
  "currency": "INR",
  "totalPayable": 584100
}
```

### Admin Endpoints (Require Admin Auth)

#### Invalidate Cache
```http
POST /api/pricing/admin/invalidate-cache

{
  "productId": "65abc123...",  // Optional: specific product
  "userSegmentId": "...",      // Optional: specific segment
  "geoZoneId": "..."           // Optional: specific zone
}
```

#### Detect Pricing Conflicts
```http
POST /api/pricing/admin/detect-conflicts

{
  "modifierId": "65def456..."
}
```

#### Get Pricing Logs
```http
GET /api/pricing/admin/logs/:orderId
```

---

## 💾 Caching Strategy

### When Cache is Used:
1. ✅ Price quotes (`/api/pricing/quote`)
2. ✅ Price breakdowns (`/api/pricing/breakdown`)
3. ❌ Order creation (always fresh, immutable snapshots)

### Cache Invalidation Triggers:
- Admin updates price modifiers
- Admin updates price book entries
- Product attribute changes
- Manual admin cache clear

### Cache Key Examples:
```
PRICE::65abc123::RETAIL::SOUTH_INDIA
PRICE::65abc123::WHOLESALE::NORTH_INDIA
PRICE::65abc123::VIP::WEST_INDIA
```

### Redis Commands for Debugging:
```bash
# Check if Redis is running
docker exec -it pricing-redis redis-cli ping

# View all cached prices
docker exec pricing-redis redis-cli KEYS 'PRICE::*'

# Get cache count
docker exec pricing-redis redis-cli DBSIZE

# View specific cached price
docker exec pricing-redis redis-cli GET "PRICE::65abc123::RETAIL::SOUTH_INDIA"

# Clear all price cache
docker exec pricing-redis redis-cli FLUSHDB

# Monitor Redis in real-time
docker exec pricing-redis redis-cli MONITOR
```

---

## 🔄 Pricing Calculation Flow

```
1. User requests price
   ↓
2. Check Redis cache
   ├─ HIT → Return cached result ✅
   └─ MISS → Continue ↓
3. Resolve user segment
   ↓
4. Lookup base price (PricingResolver)
   - Match geo zone by pincode
   - Find price book entry
   - Apply attribute pricing
   ↓
5. Calculate subtotal (basePrice × quantity)
   ↓
6. Apply modifiers (ModifierEngine)
   - Collect all applicable modifiers
   - Sort by priority & stacking rules
   - Non-stackable > Stackable
   - Apply calculations
   ↓
7. Calculate GST
   ↓
8. Build final result
   ↓
9. Store in Redis (15 min TTL)
   ↓
10. Return to user
```

---

## 🛡️ Data Integrity Features

### Immutable Order Prices
- Once order is created, prices are **frozen**
- Stored as snapshots in order document
- Admin price changes don't affect existing orders
- Full audit trail via `PricingCalculationLog`

### Conflict Detection
- Warns admins before price changes
- Shows impact on existing orders
- Lists affected order count

### Audit Logging
- Every modifier application logged
- Tracks: before/after amounts, reasons, timestamps
- Queryable by order ID

---

## 🧪 Testing & Validation

### Load Testing Script
```bash
# Located at: scripts/load-test-pricing.js
node scripts/load-test-pricing.js
```

**Tests:**
- Concurrent request handling
- Cache effectiveness
- Modifier stacking rules
- Performance benchmarks

---

## 📊 Database Schema

### Core Collections:
- `products` - Base product data
- `pricebooks` - Virtual pricing tables
- `pricemodifiers` - Discount/surcharge rules
- `usersegments` - Customer categorization
- `geozones` - Geographic pricing regions
- `attributetypes` - Dynamic product attributes
- `pricingcalculationlogs` - Audit trail
- `orders` - With embedded price snapshots

---

## 🚀 Current Status

✅ **Fully Implemented:**
- Multi-dimensional pricing resolution
- Modifier engine with stacking rules
- Redis caching with auto-invalidation
- Price snapshots for orders
- Comprehensive API endpoints
- Admin conflict detection
- Audit logging
- GST calculation

✅ **Infrastructure:**
- Redis running in Docker (`pricing-redis`)
- Server connected to Redis
- Port: `localhost:6379`
- Data persistence enabled

---

## 🎓 Key Design Principles

1. **Separation of Concerns**: Resolver → Service → Controller
2. **Immutability**: Order prices never change
3. **Performance**: Redis caching with smart invalidation
4. **Flexibility**: Multiple pricing dimensions
5. **Auditability**: Complete pricing history
6. **Extensibility**: Easy to add new modifier types

---

## 🔧 Configuration

### Environment Variables
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_URL=redis://localhost:6379

# Pricing Configuration
USE_VIRTUAL_PRICING=true
```

### Redis Setup
```bash
# Start Redis
./start-redis.sh

# Check Redis status
docker logs pricing-redis

# Stop Redis
docker stop pricing-redis

# Remove Redis (keeps data)
docker rm pricing-redis
```

---

## 📝 Example Usage

### Frontend Price Quote Request
```javascript
const response = await fetch('/api/pricing/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: '65abc123...',
    pincode: '560001',
    selectedDynamicAttributes: [
      { attributeType: 'SIZE', value: 'A4', pricingKey: 'paper_size' }
    ],
    quantity: 100
  })
});

const { pricing, meta } = await response.json();
console.log(`Total: ₹${pricing.totalPayable}`);
```

### Console Output
```
⚠️ Cache MISS: PRICE::65abc123::RETAIL::560001_ZONE
💾 Cached: PRICE::65abc123::RETAIL::560001_ZONE
```

Second request:
```
✅ Cache HIT: PRICE::65abc123::RETAIL::560001_ZONE
```

---

## 🎯 Future Enhancements (Optional)

- [ ] Time-based pricing (happy hours, seasonal)
- [ ] A/B testing for pricing strategies
- [ ] Machine learning-based dynamic pricing
- [ ] Multi-currency support
- [ ] Promotional campaign integration
- [ ] Bulk pricing API for cart calculations

---

**Status: Production Ready 🎉**

For questions or issues, refer to the code comments in:
- `src/services/pricing/PricingService.js`
- `src/services/pricing/PricingResolver.js`
- `src/services/ModifierEngine.js`
