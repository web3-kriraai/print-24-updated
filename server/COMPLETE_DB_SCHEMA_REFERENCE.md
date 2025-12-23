# Comprehensive Database Schema Reference

This document serves as the **Single Source of Truth** for the application's data layer. It details every Mongoose model, including field types, enums, relationships, and business logic constraints.

---

## **1. Identity & Profiles**

### **`User`** (`User.js`)
*The central identity entity.*

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Full Name. |
| `email` | String | Yes | **Unique**. Login credential. |
| `password` | String | Yes | Hashed. |
| `role` | Enum | No | `user` (Default), `admin`, `emp`. |
| `userSegment` | ObjectId | No | Ref: `UserSegment`. Determines pricing tier. |
| `approvalStatus` | Enum | No | `pending`, `approved`, `rejected`. |
| `signupIntent` | Enum | Yes | `CUSTOMER`, `PRINT_PARTNER`, `CORPORATE`. |

### **`CorporateProfile`** (`CorporateProfile.js`)
*Extended profile for Corporate (B2B) users.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | ObjectId | **Unique**. Ref: `User`. |
| `organizationName` | String | Company Name. |
| `organizationType` | Enum | `PRIVATE_LIMITED`, `LLP`, `HOSPITAL`, `SCHOOL`, `NGO`, etc. |
| `authorizedPersonName`| String | Contact person. |
| `designation` | Enum | `PURCHASE_MANAGER`, `DIRECTOR`, `ADMIN`, etc. |
| `verificationStatus` | Enum | `PENDING` (Default), `APPROVED`, `REJECTED`. |
| `proofDocument` | String | URL to uploaded verification doc. |

### **`PrintPartnerProfile`** (`PrintPartnerProfile.js`)
*Extended profile for Printing Partners (Resellers).*

| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | ObjectId | **Unique**. Ref: `User`. |
| `businessName` | String | |
| `gstNumber` | String | Optional for partners (unlike Corp). |
| `proofDocument` | String | Verification URL. |

### **`UserSegment`** (`UserSegment.js`)
*Grouping for pricing strategy.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | Enum | `RETAIL`, `PRINT_PARTNER`, `CORPORATE`, `VIP`. **Unique**. |
| `isDefault` | Boolean | Logic hook for auto-assignment. |

---

## **2. Product Catalog & Configuration**

### **`Category`** & **`SubCategory`**
*Hierarchical organization.*
*   **Recursive**: `Category` has `parent` (ObjectId ref `Category`) for unlimited depth.
*   **Sorting**: `sortOrder` (Number).
*   **Type**: `type` (Enum: `Digital`, `Bulk`).

### **`Product`** (`productModal.js`)
*The sellable SKU.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `dynamicAttributes` | Array | **Core Logic**. List of `AttributeType`s active for this product. |
| `productionSequence`| Array | List of `Department` IDs defining the manufacturing steps. |
| `quantityConfig` | Object | Complex logic: `SIMPLE`, `STEP_WISE` (Fixed list), or `RANGE_WISE` (Tiered). |
| `fileRules` | Object | Constraints on user uploads (Min DPI, Max Size MB). |
| `additionalDesignCharge`| Number | Cost if user requests design help. |

### **`ProductAvailability`** (`ProductAvailability.js`)
*Regional restrictions.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `product` | ObjectId | Target Product. |
| `geoZone` | ObjectId | Target Zone. |
| `isSellable` | Boolean | If false, hides "Add to Cart" for users in that zone. |

---

## **3. Dynamic Attribute Engine**

### **`AttributeType`** (`attributeTypeModal.js`)
*Defines a configurable option.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `pricingBehavior` | Enum | **CRITICAL**. `NONE` (Info), `SIGNAL_ONLY` (Add-on cost), `QUANTITY_DRIVER` (Base multiplier). |
| `inputStyle` | Enum | `DROPDOWN`, `FILE_UPLOAD`, `RADIO`, `POPUP`, `CHECKBOX`. |
| `attributeValues` | Array | List of possible choices. Each has a `pricingKey`. |

### **`AttributeRule`** (`AttributeRuleSchema.js`)
*Conditional Logic.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `when` | Object | `{ attribute: ID, value: "x" }`. Condition. |
| `then` | Array | List of Actions: `SHOW`, `HIDE`, `SET_DEFAULT`, `TRIGGER_PRICING`. |

---

## **4. Pricing System**

### **`PriceBook`** & **`Entry`**
*   **`PriceBook`**: Named list (e.g. "Standard INR").
*   **`PriceBookEntry`**: Link between `Product` + `PriceBook` -> `basePrice`.

### **`PriceModifier`** (`PriceModifier.js`)
*The Rule-Based Pricing Logic.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `appliesTo` | Enum | Scope: `GLOBAL`, `ZONE`, `SEGMENT`, `PRODUCT`, `ATTRIBUTE`. |
| `modifierType` | Enum | `PERCENT_INC`, `PERCENT_DEC`, `FLAT_INC`, `FLAT_DEC`. |
| `value` | Number | The magnitude (e.g. 10.5). |
| `priority` | Number | Execution order (Higher runs later). |

### **`PricingCalculationLog`** (`PricingCalculationLogschema.js`)
*Audit trail for math.*
*   Records `beforeAmount`, `afterAmount`, `modifier` ID, and `reason` for every step in a price calculation.

---

## **5. Order Management**

### **`Order`** (`orderModal.js`)
*The Transaction.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `priceSnapshot` | Object | **Immutable Copy** of the full pricing breakdown at checkout time. |
| `selectedDynamicAttributes` | Array | Stores user choices & `pricingKey`s. |
| `currentDepartment` | ObjectId | Pointer to current physical location in factory. |
| `status` | Enum | `REQUESTED`, `DESIGN`, `APPROVED`, `PRODUCTION`, `DISPATCHED`, `DELIVERED`. |

### **`OrderState`** (`OrderStateSchema.js`)
*State Machine Configuration.*
*   Defines valid transitions (e.g. `DESIGN` -> `PRODUCTION`).

### **`OrderStateLog`** (`OrderStateLog.js`)
*Audit Trail.*
*   Tracks `fromState`, `toState`, `changedBy` (User), and timestamp.

---

## **6. Production Workflow**

### **`Department`** (`departmentModal.js`)
*Physical Work Stations.*
*   Fields: `name`, `operators` (List of Employees), `isEnabled`.

### **`Sequence`** (`sequenceModal.js`)
*Pre-defined Workflows.*
*   Maps a `Category` to a default list of `departments` in order. Used to auto-populate `Product.productionSequence`.

---

## **7. Locations & Logistics**

### **`GeoZone`** (`GeoZon.js`)
*   Broad Regions (e.g. "Metro Cities", "North East").

### **`GeoZoneMapping`** (`GeoZonMapping.js`)
*Logic to map Pincodes to Zones.*
*   Fields: `pincodeStart` (Number), `pincodeEnd` (Number). **Indexed for speed**.

---

## **8. Support & Feedback**

### **`Complaint`** (`ComplaintSchema.js`)
*Post-order issues.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | Enum | `PRICE`, `QUALITY`, `DELIVERY`. |
| `resolutionStatus` | Enum | `OPEN`, `IN_REVIEW`, `RESOLVED`. |
| `priceSnapshot` | Mixed | Backup of price data if complaint is about billing. |

### **`Review`** (`reviewModal.js`)
*Product Ratings.*
*   Fields: `rating` (1-5), `comment`.

### **`Design`** (`uploadModal.js`)
*Temporary storage for user-uploaded assets.*
*   Fields: `safeArea`, `bleedArea`, `frontImage` (Buffer/Metadata).
