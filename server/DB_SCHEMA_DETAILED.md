# Detailed Database Schema Documentation

This document provides a comprehensive breakdown of every MongoDB model in the system, explaining each field's purpose, data type, and usage logic.

---

## **1. User Models**

### **`User`** (`User.js`)
*Represents all actors in the system: Customers, Administrators, and Employees.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Full name of the user. **Required**. |
| `email` | String | Unique email address. Used for login. **Required**. |
| `role` | Enum (`user`, `admin`, `emp`) | Defines permissions. Default: `user`. |
| `password` | String | Hashed password string. **Required**. |
| `userSegment` | ObjectId (`UserSegment`) | Links to a segment (e.g., "Corporate") for pricing logic. |
| `approvalStatus` | Enum (`pending`, `approved`, `rejected`) | Administrative gate for account activation. Default: `pending`. |
| `signupIntent` | Enum (`CUSTOMER`, `PRINT_PARTNER`, `CORPORATE`) | Captures *why* they signed up (business logic). **Required**. |
| `createdAt` | Date | Timestamp of account creation. |
| `updatedAt` | Date | Timestamp of last update. |

### **`UserSegment`** (`UserSegment.js`)
*Defines customer groups for tiered pricing (e.g., Wholesale vs Retail).*

| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | Enum (`RETAIL`, `PRINT_PARTNER`, `CORPORATE`, `VIP`) | System identifier for logic checks. **Unique/Required**. |
| `name` | String | Human-readable name (e.g., "Silver Partner"). |
| `isDefault` | Boolean | If true, applies to new users automatically. Default: `false`. |

---

## **2. Catalog Structure**

### **`Category`** (`categoryModal.js`)
*Top-level organization for products.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Category name (e.g., "Stationery"). **Required**. |
| `description` | String | Public description. |
| `image` | String | URL to cover image. |
| `type` | Enum (`Digital`, `Bulk`) | Broad classification. Default: `Digital`. |
| `parent` | ObjectId (`Category`) | Self-reference for unlimited nesting depth. Default: `null`. |
| `sortOrder` | Number | Controls display position. Lower numbers show first. |
| `slug` | String | URL-friendly ID. **Unique**. |

### **`SubCategory`** (`subcategoryModal.js`)
*Granular organization under Categories.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `category` | ObjectId (`Category`) | Parent category. **Required**. |
| `parent` | ObjectId (`SubCategory`) | Self-reference for nested sub-categories. |
| `name` | String | Name (e.g., "Business Cards"). **Required**. |
| `description` | String | Public description. |
| `image` | String | URL to cover image. |
| `slug` | String | URL-friendly ID. **Unique**. |
| `sortOrder` | Number | Sorting priority. |

---

## **3. Product Definition**

### **`Product`** (`productModal.js`)
*The core item for sale. Contains configuration, validation, and workflow logic.*

#### **Basic Info**
| Field | Type | Description |
| :--- | :--- | :--- |
| `category` | ObjectId (`Category`) | High-level grouping. **Required**. |
| `subcategory` | ObjectId (`SubCategory`) | Specific grouping. |
| `name` | String | Product name. **Required**. |
| `description` | String | HTML or Text description. |
| `descriptionArray` | [String] | Bullet points for UI display. |
| `productType` | String | Internal type tag. |
| `image` | String | Main product image URL. |

#### **Interactive Options**
| Field | Type | Description |
| :--- | :--- | :--- |
| `options` | Array | **Legacy/UI Only**. Simple visual options without deep logic. |
| `dynamicAttributes` | Array of Objects | **Core Feature**. List of active attributes for this product. |
| `dynamicAttributes.attributeType` | ObjectId (`AttributeType`) | Link to the attribute definition. |
| `dynamicAttributes.isEnabled` | Boolean | Whether this attribute shows up. |
| `dynamicAttributes.isRequired` | Boolean | Forces user selection. |
| `dynamicAttributes.displayOrder` | Number | sort order in the form. |
| `dynamicAttributes.dependsOn` | Object | Simple dependency (legacy). Use `AttributeRule` for complex logic. |

#### **Quantity Configuration**
| Field | Type | Description |
| :--- | :--- | :--- |
| `quantityConfig` | Object | Defines how quantity is handled. |
| `quantityConfig.quantityType` | Enum (`SIMPLE`, `STEP_WISE`, `RANGE_WISE`) | Logic mode. `SIMPLE`=1,2,3. `STEP`=100,200. `RANGE`=1-100, 101-500. |
| `quantityConfig.stepWiseQuantities` | [Number] | Allowed fixed quantities (e.g., [100, 250, 500]). |
| `quantityConfig.rangeWiseQuantities` | Array | Min/Max ranges for pricing lookup. |

#### **Tax & Workflow**
| Field | Type | Description |
| :--- | :--- | :--- |
| `gstPercentage` | Number | Tax rate (e.g., 18). |
| `showPriceIncludingGst` | Boolean | Toggle for catalog display preference. |
| `productionSequence` | [ObjectId (`Department`)] | Ordered list of departments (e.g. Design -> Print -> Cut). Defines workflow. |
| `fileRules` | Object | Validation rules for user uploads (Max Size, Formats). |

---

## **4. Dynamic Attributes & Logic**

### **`AttributeType`** (`attributeTypeModal.js`)
*Defines a "Kind" of option (e.g., "Paper", "Lamination").*

| Field | Type | Description |
| :--- | :--- | :--- |
| `attributeName` | String | Internal/Display name. **Required**. |
| `functionType` | Enum | Logic hint (`QUANTITY_PRICING`, `GENERAL`, etc.). |
| `pricingBehavior` | Enum | **CRITICAL**. `NONE` (no price), `SIGNAL_ONLY` (sends flag), `QUANTITY_DRIVER` (base logic). |
| `inputStyle` | Enum | UI Renderer (`DROPDOWN`, `FILE_UPLOAD`, `RADIO`, etc.). |
| `attributeValues` | Array | The selectable options. |
| `attributeValues.value` | String | System value (e.g., "gloss_300"). |
| `attributeValues.label` | String | UI Label (e.g., "300 GSM Glossy"). |
| `attributeValues.pricingKey` | String | **The Link**. Connects this specific choice to `PriceModifier` or Engine. |
| `attributeValues.hasSubAttributes` | Boolean | If true, user must select sub-options next. |
| `applicableCategories` | [ObjectId] | Limits where this attribute can be used. |

### **`SubAttribute`** (`subAttributeSchema.js`)
*Child options for Complex Attributes (e.g., Parent: "Foil" -> Child: "Gold").*

| Field | Type | Description |
| :--- | :--- | :--- |
| `parentAttribute` | ObjectId (`AttributeType`) | The master attribute. |
| `parentValue` | String | The specific choice in the parent triggering this (e.g., "foil"). |
| `value` | String | System ID. |
| `label` | String | Display text. |
| `pricingKey` | String | Connects to pricing engine. |

### **`AttributeRule`** (`AttributeRuleSchema.js`)
*Logic Engine for Conditional Logic ("If This Then That").*

| Field | Type | Description |
| :--- | :--- | :--- |
| `when` | Object | **Condition**. |
| `when.attribute` | ObjectId | The Attribute being watched. |
| `when.value` | String | The Value triggering the rule. |
| `then` | Array | **Actions**. |
| `then.action` | Enum | `SHOW`, `HIDE`, `SHOW_ONLY`, `SET_DEFAULT`, `TRIGGER_PRICING`. |
| `then.targetAttribute` | ObjectId | The attribute to change (for UI actions). |
| `then.pricingSignal` | Object | JSON payload sent to pricing engine (for `TRIGGER_PRICING`). |
| `applicableProduct` | ObjectId | Optional scope limitation. |

---

## **5. Pricing Engine**

### **`PriceBook`** (`PriceBook.js`)
*Container for standard price lists.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | e.g., "Standard INR", "Wholesale 2024". |
| `currency` | String | e.g., "INR". |
| `isDefault` | Boolean | Fallback price book. |

### **`PriceBookEntry`** (`PriceBookEntry.js`)
*The base price for a specific product.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `priceBook` | ObjectId | The book this calculation belongs to. |
| `product` | ObjectId | The product being priced. |
| `basePrice` | Number | Starting cost before modifiers. |
| `compareAtPrice` | Number | "Strike-through" price for display. |

### **`PriceModifier`** (`PriceModifier.js`)
*Dynamic rules to adjust base price.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `appliesTo` | Enum | Scope: `GLOBAL`, `ZONE`, `SEGMENT`, `PRODUCT`, `ATTRIBUTE`. |
| `modifierType` | Enum | Math logic: `PERCENT_INC`, `FLAT_INC`, `PERCENT_DEC`. |
| `value` | Number | The amount (e.g., 10 for 10%). |
| `priority` | Number | Execution order (Higher runs later). |
| `geoZone` | ObjectId | If scoped to ZONE. |
| `userSegment` | ObjectId | If scoped to SEGMENT. |
| `attributeValue` | String | If scoped to ATTRIBUTE (matches `pricingKey`). |

### **`GeoZone`** (`GeoZon.js`)
*Regional definitions.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Region name. |
| `currency` | String | Currency used here. |
| `isRestricted` | Boolean | If true, we do not ship here. |

---

## **6. Orders & Workflow**

### **`Order`** (`orderModal.js`)
*The master transaction record.*

#### **Core Data**
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | ObjectId (`User`) | Customer Reference. |
| `product` | ObjectId (`Product`) | Item purchased. |
| `orderNumber` | String | Unique human-readable ID (e.g., "ORD-1234"). |
| `status` | Enum | `REQUESTED`, `APPROVED`, `PRODUCTION`, `DISPATCHED`, etc. |

#### **Configuration Snapshot**
| Field | Type | Description |
| :--- | :--- | :--- |
| `quantity` | Number | Final count. |
| `selectedDynamicAttributes` | Array | **Crucial**. Stores every choice the user made. Includes `pricingKey` and uploaded file buffers. |

#### **Financial Snapshot**
| Field | Type | Description |
| :--- | :--- | :--- |
| `priceSnapshot` | Object | **Immutable Record**. Stores the *result* of the pricing engine at checkout. |
| `priceSnapshot.basePrice` | Number | Starting price used. |
| `priceSnapshot.appliedModifiers` | Array | List of every rule that changed the price (Name + Amount). |
| `priceSnapshot.totalPayable` | Number | Final charge to card. |

#### **Production Tracking**
| Field | Type | Description |
| :--- | :--- | :--- |
| `currentDepartment` | ObjectId (`Department`) | **Workflow Pointer**. Indicates physical location. Updates as order moves through `productionSequence`. |
| `notes` | String | Customer notes. |
| `adminNotes` | String | Internal factory notes. |

### **`Department`** (`departmentModal.js`)
*Physical stations in the factory.*

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | e.g., "Graphic Design", "Offset Press". **Unique**. |
| `operators` | [ObjectId (`User`)] | Employees assigned to this station. |
| `isEnabled` | Boolean | toggle availability. |
