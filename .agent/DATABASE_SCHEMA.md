# 📊 DATABASE SCHEMA DOCUMENTATION

**Project:** Print24 - Printing & Design Platform  
**Database:** MongoDB (Mongoose ODM)  
**Total Collections:** 26  
**Last Updated:** 2025-12-30

---

## 📑 **TABLE OF CONTENTS**

1. [User Management](#user-management)
2. [Product Catalog](#product-catalog)
3. [Order Management](#order-management)
4. [Pricing System](#pricing-system)
5. [Partner Management](#partner-management)
6. [Production Workflow](#production-workflow)
7. [Support & Feedback](#support--feedback)

---

## 1. USER MANAGEMENT

### **users**
**Purpose:** Core user authentication and profile data

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Full name |
| `email` | String | Yes | - | Unique email (indexed) |
| `password` | String | Yes | - | Hashed password |
| `role` | String | Yes | "customer" | Enum: customer, admin, corporate |
| `userType` | String | No | - | Alias for role |
| `phoneNumber` | String | No | - | Contact number |
| `address` | Object | No | - | Shipping address |
| `address.street` | String | No | - | Street address |
| `address.city` | String | No | - | City |
| `address.state` | String | No | - | State |
| `address.pincode` | String | No | - | Postal code |
| `address.country` | String | No | - | Country |
| `userSegmentId` | ObjectId | No | - | Ref: UserSegment |
| `isActive` | Boolean | No | true | Account status |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `email` (unique)
- `role`
- `userSegmentId`

---

### **UserSegment**
**Purpose:** Customer segmentation for pricing (VIP, Wholesale, Retail)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Segment name (e.g., "VIP") |
| `code` | String | Yes | - | Unique code (e.g., "VIP_GOLD") |
| `description` | String | No | - | Segment description |
| `criteria` | Mixed | No | - | JSON criteria for auto-assignment |
| `isDefault` | Boolean | No | false | Default segment for new users |
| `isActive` | Boolean | No | true | Segment status |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `code` (unique)
- `isDefault`

---

## 2. PRODUCT CATALOG

### **categories**
**Purpose:** Top-level product categories

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Category name |
| `description` | String | No | - | Category description |
| `image` | String | No | - | Category image URL |
| `isActive` | Boolean | No | true | Visibility status |
| `displayOrder` | Number | No | 0 | Sort order |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `name`
- `isActive`

---

### **subcategories**
**Purpose:** Product subcategories within categories

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Subcategory name |
| `category` | ObjectId | Yes | - | Ref: Category |
| `description` | String | No | - | Subcategory description |
| `image` | String | No | - | Subcategory image URL |
| `isActive` | Boolean | No | true | Visibility status |
| `displayOrder` | Number | No | 0 | Sort order |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `category`
- `name`

---

### **products**
**Purpose:** Core product catalog

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Product name |
| `sku` | String | No | - | Stock keeping unit |
| `description` | String | No | - | Product description |
| `category` | ObjectId | Yes | - | Ref: Category |
| `subCategory` | ObjectId | No | - | Ref: SubCategory |
| `image` | String | No | - | Primary product image |
| `images` | [String] | No | [] | Additional images |
| `basePrice` | Number | No | 0 | Base price (deprecated, use PriceBook) |
| `gstPercentage` | Number | No | 18 | GST/Tax percentage |
| `isActive` | Boolean | No | true | Product availability |
| `isFeatured` | Boolean | No | false | Featured product flag |
| `tags` | [String] | No | [] | Search tags |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `category`
- `subCategory`
- `isActive`
- `sku` (unique, sparse)

---

### **attributeTypes**
**Purpose:** Define product attributes (Paper Type, Size, Finish, etc.)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `attributeName` | String | Yes | - | Attribute name |
| `functionType` | String | No | "GENERAL" | Enum: QUANTITY_PRICING, PRINTING_IMAGE, SPOT_UV_IMAGE, GENERAL |
| `pricingBehavior` | String | No | "NONE" | Enum: NONE, SIGNAL_ONLY, QUANTITY_DRIVER |
| `inputStyle` | String | No | "DROPDOWN" | Enum: DROPDOWN, TEXT_FIELD, FILE_UPLOAD, NUMBER, CHECKBOX, RADIO, POPUP |
| `displayOrder` | Number | No | 0 | Display order in UI |
| `quantityConfig` | Object | No | - | Quantity configuration |
| `quantityConfig.quantityType` | String | No | "SIMPLE" | Enum: SIMPLE, STEP_WISE, RANGE_WISE |
| `quantityConfig.minQuantity` | Number | No | - | Minimum quantity |
| `quantityConfig.maxQuantity` | Number | No | - | Maximum quantity |
| `quantityConfig.quantityMultiples` | Number | No | - | Quantity increments |
| `quantityConfig.stepWiseQuantities` | [Number] | No | - | Predefined quantities |
| `quantityConfig.rangeWiseQuantities` | [Object] | No | - | Quantity ranges with multipliers |
| `primaryEffectType` | String | No | "INFORMATIONAL" | Enum: PRICE, FILE, VARIANT, INFORMATIONAL |
| `effectDescription` | String | No | "" | Effect description |
| `isFilterable` | Boolean | No | false | Can be used as filter |
| `defaultValue` | String | No | - | Default value |
| `isCommonAttribute` | Boolean | No | false | Available across all categories |
| `applicableCategories` | [ObjectId] | No | [] | Ref: Category |
| `applicableSubCategories` | [ObjectId] | No | [] | Ref: SubCategory |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `attributeName`
- `pricingBehavior`
- `isCommonAttribute`

---

### **subAttributes**
**Purpose:** Attribute values/options (Matte, Glossy, A4, A5, etc.)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `parentAttribute` | ObjectId | Yes | - | Ref: AttributeType |
| `parentValue` | String | Yes | - | Parent value ("__root__" for top level) |
| `value` | String | Yes | - | System value (lowercase) |
| `label` | String | Yes | - | Display label |
| `image` | String | No | null | Option image URL |
| `pricingKey` | String | Yes | - | **CRITICAL:** Pricing modifier key (uppercase) |
| `isEnabled` | Boolean | No | true | Option availability |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `parentAttribute`
- `pricingKey`
- `isEnabled`
- `{parentAttribute, parentValue, value}` (unique compound)

---

### **AttributeRules**
**Purpose:** Conditional attribute logic (show/hide based on selections)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Rule name |
| `description` | String | No | - | Rule description |
| `category` | ObjectId | No | - | Ref: Category |
| `subCategory` | ObjectId | No | - | Ref: SubCategory |
| `when` | Object | Yes | - | Trigger condition |
| `when.attribute` | ObjectId | Yes | - | Ref: AttributeType |
| `when.operator` | String | Yes | - | Enum: EQUALS, NOT_EQUALS, IN, NOT_IN |
| `when.value` | Mixed | Yes | - | Comparison value |
| `actions` | [Object] | Yes | - | Actions to perform |
| `actions[].type` | String | Yes | - | Enum: SHOW_ATTRIBUTE, HIDE_ATTRIBUTE, SET_VALUE, TRIGGER_PRICING |
| `actions[].targetAttribute` | ObjectId | No | - | Ref: AttributeType |
| `actions[].value` | Mixed | No | - | Action value |
| `priority` | Number | No | 0 | Execution priority |
| `isActive` | Boolean | No | true | Rule status |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `category`
- `when.attribute`
- `isActive`

---

## 3. ORDER MANAGEMENT

### **orders**
**Purpose:** Customer orders

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `orderNumber` | String | Auto | - | Unique order number |
| `user` | ObjectId | Yes | - | Ref: User |
| `product` | ObjectId | Yes | - | Ref: Product |
| `quantity` | Number | Yes | 1 | Order quantity |
| `selectedAttributes` | [Object] | No | [] | Selected product attributes |
| `selectedAttributes[].attributeType` | ObjectId | Yes | - | Ref: AttributeType |
| `selectedAttributes[].value` | String | Yes | - | Selected value |
| `selectedAttributes[].pricingKey` | String | No | - | Pricing key |
| `uploadedFiles` | [Object] | No | [] | Customer uploaded files |
| `uploadedFiles[].attributeType` | ObjectId | Yes | - | Ref: AttributeType |
| `uploadedFiles[].fileUrl` | String | Yes | - | File URL |
| `uploadedFiles[].fileName` | String | Yes | - | Original filename |
| `pricing` | Object | No | - | Pricing breakdown |
| `pricing.basePrice` | Number | Yes | - | Base product price |
| `pricing.modifiers` | [Object] | No | [] | Applied modifiers |
| `pricing.subtotal` | Number | Yes | - | Subtotal before tax |
| `pricing.gst` | Number | Yes | - | GST amount |
| `pricing.finalPrice` | Number | Yes | - | Total price |
| `status` | String | No | "pending" | Enum: pending, confirmed, in_production, completed, cancelled |
| `currentDepartment` | ObjectId | No | - | Ref: Department |
| `currentSequenceStep` | Number | No | 0 | Current production step |
| `paymentStatus` | String | No | "pending" | Enum: pending, paid, failed |
| `paymentMethod` | String | No | - | Payment method used |
| `shippingAddress` | Object | No | - | Delivery address |
| `notes` | String | No | - | Order notes |
| `createdAt` | Date | Auto | - | Order date |
| `updatedAt` | Date | Auto | - | Last update |

**Indexes:**
- `orderNumber` (unique)
- `user`
- `status`
- `currentDepartment`

---

### **OrderStateLogs**
**Purpose:** Order status change history

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `order` | ObjectId | Yes | - | Ref: Order |
| `fromState` | String | No | - | Previous status |
| `toState` | String | Yes | - | New status |
| `changedBy` | ObjectId | Yes | - | Ref: User |
| `reason` | String | No | - | Change reason |
| `timestamp` | Date | Auto | - | Change timestamp |

**Indexes:**
- `order`
- `timestamp`

---

### **OrderStates**
**Purpose:** Define order states and transitions

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | State name |
| `code` | String | Yes | - | Unique code |
| `description` | String | No | - | State description |
| `allowedTransitions` | [String] | No | [] | Valid next states |
| `color` | String | No | - | UI color code |
| `icon` | String | No | - | UI icon |
| `isActive` | Boolean | No | true | State availability |

**Indexes:**
- `code` (unique)

---

## 4. PRICING SYSTEM

### **PriceBooks**
**Purpose:** Price catalogs for different markets/currencies

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Price book name |
| `currency` | String | Yes | "INR" | Currency code (ISO 4217) |
| `description` | String | No | - | Price book description |
| `isDefault` | Boolean | No | false | Default price book |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `name`
- `isDefault`

---

### **PriceBookEntries**
**Purpose:** Product prices within price books

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `priceBook` | ObjectId | Yes | - | Ref: PriceBook |
| `product` | ObjectId | Yes | - | Ref: Product |
| `basePrice` | Number | Yes | - | Base price |
| `compareAtPrice` | Number | No | - | Original/strike-through price |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `priceBook`
- `product`
- `{priceBook, product}` (unique compound)

---

### **PriceModifiers**
**Purpose:** Dynamic pricing rules (discounts, surcharges)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | No | - | Modifier name |
| `description` | String | No | - | Modifier description |
| `appliesTo` | String | Yes | - | Enum: GLOBAL, ZONE, SEGMENT, PRODUCT, ATTRIBUTE, COMBINATION |
| `geoZone` | ObjectId | No | - | Ref: GeoZone (if appliesTo=ZONE) |
| `userSegment` | ObjectId | No | - | Ref: UserSegment (if appliesTo=SEGMENT) |
| `product` | ObjectId | No | - | Ref: Product (if appliesTo=PRODUCT) |
| `attributeType` | ObjectId | No | - | Ref: AttributeType (if appliesTo=ATTRIBUTE) |
| `attributeValue` | String | No | - | Attribute value to match |
| `modifierType` | String | Yes | - | Enum: PERCENT_INC, PERCENT_DEC, FLAT_INC, FLAT_DEC |
| `value` | Number | Yes | - | Modifier value |
| `minQuantity` | Number | No | - | Minimum quantity threshold |
| `maxQuantity` | Number | No | - | Maximum quantity threshold |
| `validFrom` | Date | No | - | Start date |
| `validTo` | Date | No | - | End date |
| `priority` | Number | No | 0 | Application priority (lower first) |
| `isActive` | Boolean | No | true | Modifier status |
| `isStackable` | Boolean | No | true | Can combine with other modifiers |
| `conditions` | Mixed | No | - | **JSON conditions for COMBINATION type** |
| `reason` | String | No | - | Modifier reason/description |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `appliesTo`
- `geoZone`
- `userSegment`
- `product`
- `attributeType`
- `priority`
- `isActive`

---

### **GeoZones**
**Purpose:** Geographic zones for regional pricing (hierarchical)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Zone name |
| `code` | String | No | - | Zone code |
| `level` | String | Yes | - | Enum: COUNTRY, STATE, DISTRICT, CITY, ZIP |
| `parentZone` | ObjectId | No | null | Ref: GeoZone (parent zone) |
| `priority` | Number | Auto | - | Auto-assigned based on level |
| `currency` | String | Yes | "INR" | Default currency |
| `isRestricted` | Boolean | No | false | Restricted zone flag |
| `restrictionReason` | String | No | - | Restriction reason |
| `isActive` | Boolean | No | true | Zone status |
| `description` | String | No | - | Zone description |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `name`
- `code`
- `level`
- `parentZone`
- `priority`

**Methods:**
- `getAncestors()` - Get parent zones
- `getChildren()` - Get child zones
- `getHierarchyPath()` - Get full path (e.g., "USA > NY > Manhattan")
- `resolveByPincode(pincode)` - Find zone by pincode

---

### **GeoZoneMappings**
**Purpose:** Map pincodes/zipcodes to geo zones

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `geoZone` | ObjectId | Yes | - | Ref: GeoZone |
| `countryCode` | String | No | - | Country code (ISO 3166) |
| `zipCodeStart` | String | No | - | Starting zipcode |
| `zipCodeEnd` | String | No | - | Ending zipcode |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `geoZone`
- `zipCodeStart`

---

### **SegmentPriceBooks**
**Purpose:** Map user segments to price books

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `userSegment` | ObjectId | Yes | - | Ref: UserSegment |
| `priceBook` | ObjectId | Yes | - | Ref: PriceBook |
| `priority` | Number | No | 0 | Selection priority |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `userSegment`
- `priceBook`

---

### **ProductAvailability**
**Purpose:** Product restrictions by geo zone

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `product` | ObjectId | Yes | - | Ref: Product |
| `geoZone` | ObjectId | Yes | - | Ref: GeoZone |
| `isSellable` | Boolean | Yes | true | Can be sold in this zone |
| `restrictionReason` | String | No | - | Reason for restriction |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `product`
- `geoZone`
- `{product, geoZone}` (unique compound)

---

### **PricingCalculationLogs**
**Purpose:** Audit trail for pricing calculations

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `user` | ObjectId | No | - | Ref: User |
| `product` | ObjectId | Yes | - | Ref: Product |
| `quantity` | Number | Yes | - | Quantity |
| `userSegment` | ObjectId | No | - | Ref: UserSegment |
| `geoZone` | ObjectId | No | - | Ref: GeoZone |
| `selectedAttributes` | [Object] | No | [] | Selected attributes |
| `basePrice` | Number | Yes | - | Base price |
| `appliedModifiers` | [Object] | No | [] | Applied modifiers |
| `finalPrice` | Number | Yes | - | Final calculated price |
| `calculatedAt` | Date | Auto | - | Calculation timestamp |

**Indexes:**
- `user`
- `product`
- `calculatedAt`

---

## 5. PARTNER MANAGEMENT

### **PrintPartnerProfiles**
**Purpose:** Print partner vendor profiles

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `user` | ObjectId | Yes | - | Ref: User |
| `companyName` | String | Yes | - | Company name |
| `businessType` | String | No | - | Business type |
| `gstNumber` | String | No | - | GST registration number |
| `address` | Object | No | - | Business address |
| `contactPerson` | String | No | - | Contact person name |
| `phoneNumber` | String | No | - | Contact number |
| `email` | String | No | - | Contact email |
| `capabilities` | [String] | No | [] | Printing capabilities |
| `certifications` | [String] | No | [] | Certifications |
| `status` | String | No | "pending" | Enum: pending, approved, rejected |
| `approvedBy` | ObjectId | No | - | Ref: User (admin) |
| `approvedAt` | Date | No | - | Approval timestamp |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `user`
- `status`
- `gstNumber`

---

### **CorporateProfiles**
**Purpose:** Corporate customer profiles

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `user` | ObjectId | Yes | - | Ref: User |
| `companyName` | String | Yes | - | Company name |
| `industry` | String | No | - | Industry type |
| `gstNumber` | String | No | - | GST registration number |
| `address` | Object | No | - | Business address |
| `contactPerson` | String | No | - | Contact person name |
| `phoneNumber` | String | No | - | Contact number |
| `email` | String | No | - | Contact email |
| `creditLimit` | Number | No | 0 | Credit limit |
| `paymentTerms` | String | No | - | Payment terms |
| `status` | String | No | "pending" | Enum: pending, approved, rejected |
| `approvedBy` | ObjectId | No | - | Ref: User (admin) |
| `approvedAt` | Date | No | - | Approval timestamp |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `user`
- `status`
- `gstNumber`

---

## 6. PRODUCTION WORKFLOW

### **departments**
**Purpose:** Production departments

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Department name |
| `code` | String | Yes | - | Unique code |
| `description` | String | No | - | Department description |
| `isActive` | Boolean | No | true | Department status |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `code` (unique)

---

### **sequences**
**Purpose:** Production workflow sequences

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `name` | String | Yes | - | Sequence name |
| `category` | ObjectId | No | - | Ref: Category |
| `subCategory` | ObjectId | No | - | Ref: SubCategory |
| `steps` | [Object] | Yes | [] | Production steps |
| `steps[].department` | ObjectId | Yes | - | Ref: Department |
| `steps[].order` | Number | Yes | - | Step order |
| `steps[].estimatedTime` | Number | No | - | Estimated time (hours) |
| `steps[].description` | String | No | - | Step description |
| `isActive` | Boolean | No | true | Sequence status |
| `createdAt` | Date | Auto | - | Creation timestamp |
| `updatedAt` | Date | Auto | - | Last update timestamp |

**Indexes:**
- `category`
- `subCategory`

---

## 7. SUPPORT & FEEDBACK

### **reviews**
**Purpose:** Product reviews and ratings

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `user` | ObjectId | Yes | - | Ref: User |
| `product` | ObjectId | Yes | - | Ref: Product |
| `order` | ObjectId | No | - | Ref: Order |
| `rating` | Number | Yes | - | Rating (1-5) |
| `title` | String | No | - | Review title |
| `comment` | String | No | - | Review comment |
| `images` | [String] | No | [] | Review images |
| `isVerifiedPurchase` | Boolean | No | false | Verified purchase flag |
| `isApproved` | Boolean | No | false | Admin approval status |
| `createdAt` | Date | Auto | - | Review date |
| `updatedAt` | Date | Auto | - | Last update |

**Indexes:**
- `product`
- `user`
- `rating`

---

### **complaints**
**Purpose:** Customer complaints and support tickets

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `user` | ObjectId | Yes | - | Ref: User |
| `order` | ObjectId | No | - | Ref: Order |
| `subject` | String | Yes | - | Complaint subject |
| `description` | String | Yes | - | Complaint description |
| `category` | String | No | - | Complaint category |
| `priority` | String | No | "medium" | Enum: low, medium, high, urgent |
| `status` | String | No | "open" | Enum: open, in_progress, resolved, closed |
| `assignedTo` | ObjectId | No | - | Ref: User (support agent) |
| `resolution` | String | No | - | Resolution notes |
| `attachments` | [String] | No | [] | Attachment URLs |
| `createdAt` | Date | Auto | - | Complaint date |
| `updatedAt` | Date | Auto | - | Last update |
| `resolvedAt` | Date | No | - | Resolution date |

**Indexes:**
- `user`
- `order`
- `status`
- `priority`

---

### **uploads**
**Purpose:** File upload tracking

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | - | Primary key |
| `user` | ObjectId | Yes | - | Ref: User |
| `order` | ObjectId | No | - | Ref: Order |
| `fileName` | String | Yes | - | Original filename |
| `fileUrl` | String | Yes | - | Stored file URL |
| `fileType` | String | No | - | MIME type |
| `fileSize` | Number | No | - | File size (bytes) |
| `uploadType` | String | No | - | Upload purpose |
| `createdAt` | Date | Auto | - | Upload timestamp |

**Indexes:**
- `user`
- `order`

---

## 📊 **RELATIONSHIPS DIAGRAM**

```
users
  ├─→ UserSegment (userSegmentId)
  ├─→ orders (user)
  ├─→ reviews (user)
  └─→ complaints (user)

products
  ├─→ categories (category)
  ├─→ subcategories (subCategory)
  ├─→ PriceBookEntries (product)
  ├─→ orders (product)
  └─→ reviews (product)

orders
  ├─→ users (user)
  ├─→ products (product)
  ├─→ departments (currentDepartment)
  ├─→ attributeTypes (selectedAttributes[].attributeType)
  └─→ OrderStateLogs (order)

PriceBooks
  ├─→ PriceBookEntries (priceBook)
  └─→ SegmentPriceBooks (priceBook)

PriceModifiers
  ├─→ GeoZones (geoZone)
  ├─→ UserSegment (userSegment)
  ├─→ products (product)
  └─→ attributeTypes (attributeType)

GeoZones (Hierarchical)
  ├─→ GeoZones (parentZone) - self-reference
  ├─→ GeoZoneMappings (geoZone)
  └─→ ProductAvailability (geoZone)

attributeTypes
  ├─→ subAttributes (parentAttribute)
  └─→ AttributeRules (when.attribute, actions[].targetAttribute)

sequences
  ├─→ categories (category)
  ├─→ subcategories (subCategory)
  └─→ departments (steps[].department)
```

---

## 🔑 **KEY CONCEPTS**

### **Dynamic Pricing Flow**
1. User selects product + attributes
2. System resolves user segment
3. System resolves geo zone (from pincode)
4. Get base price from PriceBook
5. Apply PriceModifiers (by priority):
   - GLOBAL modifiers
   - ZONE modifiers (geo-based)
   - SEGMENT modifiers (user tier)
   - PRODUCT modifiers (specific products)
   - ATTRIBUTE modifiers (based on selections)
6. Calculate final price with GST
7. Log calculation in PricingCalculationLogs

### **Hierarchical Geo Zones**
```
COUNTRY (Priority 1)
  └─ STATE (Priority 2)
      └─ DISTRICT (Priority 3)
          └─ CITY (Priority 4)
              └─ ZIP (Priority 5)
```
Most specific zone wins in pricing resolution.

### **Attribute-Based Pricing**
- AttributeTypes define attributes (Paper Type, Size, Finish)
- SubAttributes define options (Matte, Glossy, A4, A5)
- Each SubAttribute has a `pricingKey` (e.g., "PREMIUM_MATTE")
- PriceModifiers target `pricingKey` to apply surcharges/discounts

---

## 📈 **INDEXES SUMMARY**

**Total Indexes:** 80+

**Most Important:**
- `users.email` (unique)
- `products.sku` (unique, sparse)
- `orders.orderNumber` (unique)
- `PriceBookEntries.{priceBook, product}` (unique compound)
- `subAttributes.{parentAttribute, parentValue, value}` (unique compound)
- `GeoZones.{level, parentZone}`
- `PriceModifiers.{appliesTo, priority, isActive}`

---

## 🎯 **COLLECTION STATISTICS**

| Collection | Estimated Docs | Growth Rate | Critical |
|------------|---------------|-------------|----------|
| users | 10K-100K | Medium | ✅ High |
| products | 1K-10K | Low | ✅ High |
| orders | 100K-1M | High | ✅ High |
| PriceModifiers | 100-1K | Low | ✅ High |
| attributeTypes | 50-200 | Low | Medium |
| subAttributes | 500-2K | Low | Medium |
| GeoZones | 100-500 | Low | Medium |
| reviews | 10K-100K | Medium | Low |

---

**Last Updated:** 2025-12-30  
**Total Collections:** 26  
**Total Fields:** 200+  
**Database Type:** MongoDB with Mongoose ODM
