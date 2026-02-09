# Shipment & Courier API Documentation

Complete documentation of all shipment and courier-related APIs for the 3PL (Third-Party Logistics) integration.

---

## Table of Contents

- [Public Endpoints](#public-endpoints)
- [Protected Endpoints (Authenticated Users)](#protected-endpoints-authenticated-users)
- [Admin Endpoints](#admin-endpoints)
- [Webhook Endpoints](#webhook-endpoints)
- [Logistics Admin Endpoints](#logistics-admin-endpoints)

---

## Base URL

```
/api/courier
```

---

## Public Endpoints

### 1. Check Serviceability

Check if a pincode is serviceable by external couriers.

**Endpoint:** `POST /api/courier/check-serviceability`

**Authentication:** None

**Request Body:**
```json
{
  "pickupPincode": "395006",
  "deliveryPincode": "110001",
  "weight": 0.5,
  "paymentMode": "PREPAID"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pickupPincode` | string | ✅ Yes | - | Origin pincode |
| `deliveryPincode` | string | ✅ Yes | - | Destination pincode |
| `weight` | number | ❌ No | 0.5 | Package weight in kg |
| `paymentMode` | string | ❌ No | "PREPAID" | "PREPAID" or "COD" |

**Success Response (200):**
```json
{
  "success": true,
  "available": true,
  "couriers": [
    {
      "courierId": 12,
      "courierName": "Blue Dart",
      "estimatedDays": 3,
      "rate": 85.50,
      "codCharges": 35,
      "freightCharge": 50,
      "etd": "2024-02-10"
    }
  ],
  "recommendedCourier": {
    "courierId": 12,
    "courierName": "Blue Dart",
    "estimatedDays": 3,
    "rate": 85.50
  }
}
```

---

### 2. Get Tracking by AWB

Get tracking information by AWB (Air Way Bill) code.

**Endpoint:** `GET /api/courier/tracking/:awbCode`

**Authentication:** None

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `awbCode` | string | ✅ Yes | AWB tracking number |

**Success Response (200):**
```json
{
  "success": true,
  "currentStatus": "In Transit",
  "currentStatusId": 18,
  "originCity": "Surat",
  "destinationCity": "Delhi",
  "etd": "2024-02-10",
  "courierName": "Blue Dart",
  "activities": [
    {
      "status": "Shipment In Transit",
      "location": "Mumbai Hub",
      "date": "2024-02-08",
      "srStatus": "IN_TRANSIT",
      "srStatusLabel": "In Transit"
    }
  ]
}
```

---

### 3. Select Best Courier (Smart Routing)

Select the best courier for a delivery based on pincode and routing logic.

**Endpoint:** `POST /api/courier/select-best`

**Authentication:** None

**Request Body:**
```json
{
  "deliveryPincode": "110001",
  "weight": 0.5,
  "paymentMode": "PREPAID",
  "pickupPincode": "395006"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `deliveryPincode` | string | ✅ Yes | - | Destination pincode |
| `weight` | number | ❌ No | 0.5 | Package weight in kg |
| `paymentMode` | string | ❌ No | "PREPAID" | "PREPAID" or "COD" |
| `pickupPincode` | string | ❌ No | "395006" | Origin pincode |

**Success Response (200):**
```json
{
  "success": true,
  "provider": "SHIPROCKET",
  "providerName": "Shiprocket",
  "couriers": [...],
  "recommendedCourier": {
    "courierId": 12,
    "courierName": "Blue Dart",
    "estimatedDays": 3,
    "rate": 85.50
  },
  "estimatedDays": 3,
  "rate": 85.50
}
```

---

## Protected Endpoints (Authenticated Users)

These endpoints require user authentication via JWT token.

### 4. Get Tracking by Order ID

Get tracking information by internal order ID.

**Endpoint:** `GET /api/courier/tracking/order/:orderId`

**Authentication:** Required (Bearer Token)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | ✅ Yes | MongoDB Order ID |

**Success Response (200):**
```json
{
  "success": true,
  "orderId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "orderNumber": "ORD-2024-001234",
  "currentStatus": "In Transit",
  "awbCode": "1234567890",
  "courierName": "Blue Dart",
  "activities": [...]
}
```

---

### 5. Create User Shipment

Create shipment for user's own order (authenticated users can trigger external delivery).

**Endpoint:** `POST /api/courier/create-user-shipment/:orderId`

**Authentication:** Required (Bearer Token)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | ✅ Yes | MongoDB Order ID |

**Request Body:**
```json
{
  "courierId": 12,
  "city": "Mumbai",
  "state": "Maharashtra"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courierId` | number | ❌ No | Specific courier ID (auto-selects if not provided) |
| `city` | string | ❌ No | City name (auto-extracted from address if not provided) |
| `state` | string | ❌ No | State name (auto-extracted from address if not provided) |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "deliveryType": "EXTERNAL",
  "shiprocketOrderId": "123456789",
  "shiprocketShipmentId": "987654321",
  "awbCode": "1234567890",
  "courierName": "Blue Dart",
  "trackingUrl": "https://shiprocket.co/tracking/1234567890"
}
```

---

## Admin Endpoints

These endpoints require admin authentication.

### 6. Create Shipment (Admin)

Create shipment for any order.

**Endpoint:** `POST /api/courier/create-shipment/:orderId`

**Authentication:** Required (Admin Only)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | ✅ Yes | MongoDB Order ID |

**Request Body:**
```json
{
  "courierId": 12,
  "pickupPincode": "395006",
  "city": "Mumbai",
  "state": "Maharashtra"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courierId` | number | ❌ No | Specific courier ID |
| `pickupPincode` | string | ❌ No | Origin pincode (default: "395006") |
| `city` | string | ❌ No | City name |
| `state` | string | ❌ No | State name |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "shiprocketOrderId": "123456789",
  "shiprocketShipmentId": "987654321",
  "awbCode": "1234567890",
  "courierName": "Blue Dart",
  "trackingUrl": "https://shiprocket.co/tracking/1234567890"
}
```

---

### 7. Cancel Shipment

Cancel an existing shipment.

**Endpoint:** `POST /api/courier/cancel-shipment/:orderId`

**Authentication:** Required (Admin Only)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | ✅ Yes | MongoDB Order ID |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Shipment cancelled successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Cannot cancel - shipment already delivered"
}
```

---

### 8. Get Pickup Locations

Get all pickup locations/warehouses from Shiprocket.

**Endpoint:** `GET /api/courier/pickup-locations`

**Authentication:** Required (Admin Only)

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "locations": [
    {
      "id": 123,
      "name": "Primary Warehouse",
      "address": "123 Main Street",
      "city": "Surat",
      "state": "Gujarat",
      "pincode": "395006",
      "phone": "9876543210",
      "isPrimary": true
    }
  ]
}
```

---

## Webhook Endpoints

These endpoints are called by 3PL providers (Shiprocket) for status updates.

### 9. Courier Status Update Webhook

Receive shipment status updates from Shiprocket.

**Endpoint:** `POST /api/courier/webhook`

**Authentication:** Optional (Signature verification if `SHIPROCKET_WEBHOOK_SECRET` is set)

**Headers:**
| Header | Description |
|--------|-------------|
| `x-shiprocket-signature` | Optional signature for verification |

**Request Body (Format 1 - Direct):**
```json
{
  "awb": "1234567890",
  "order_id": "ORD-2024-001234",
  "current_status": "Delivered",
  "current_status_id": 7,
  "location": "Delhi",
  "scans": [
    {
      "location": "Delhi Hub",
      "date": "2024-02-10",
      "time": "14:30",
      "activity": "Delivered to customer",
      "remarks": "Signed by: John Doe"
    }
  ]
}
```

**Request Body (Format 2 - Tracking Data):**
```json
{
  "tracking_data": {
    "awb_code": "1234567890",
    "order_id": "ORD-2024-001234",
    "current_status": "In Transit",
    "scans": [...]
  }
}
```

**Request Body (Format 3 - Alternative):**
```json
{
  "awb_code": "1234567890",
  "channel_order_id": "ORD-2024-001234",
  "current_status": "Out For Delivery",
  "location": "Local Hub"
}
```

**Success Response (200):**
```json
{
  "received": true,
  "processed": true,
  "orderId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "orderNumber": "ORD-2024-001234",
  "previousStatus": "in_transit",
  "newStatus": "delivered",
  "processingTime": 45
}
```

---

### 10. Test Webhook

Test endpoint for debugging webhooks.

**Endpoint:** `POST /api/courier/webhook-test`

**Authentication:** None

**Request Body:** Any JSON

**Success Response (200):**
```json
{
  "received": true,
  "timestamp": "2024-02-08T10:30:00.000Z",
  "headers": {...},
  "body": {...}
}
```

---

## Logistics Admin Endpoints

Admin endpoints for managing logistics providers.

**Base URL:** `/api/admin`

### 11. Get All Logistics Providers

Get all configured logistics providers.

**Endpoint:** `GET /api/admin/logistics-providers`

**Authentication:** Required (Admin Only)

**Success Response (200):**
```json
{
  "success": true,
  "providers": [
    {
      "_id": "65a1b2c3...",
      "name": "SHIPROCKET",
      "type": "EXTERNAL",
      "displayName": "Shiprocket",
      "isActive": true,
      "priority": 100,
      "averageDeliveryTime": 3,
      "supportsCOD": true,
      "supportsReverse": true,
      "hasCredentials": true
    },
    {
      "_id": "65a1b2c4...",
      "name": "INTERNAL",
      "type": "INTERNAL",
      "displayName": "Internal Delivery",
      "isActive": true,
      "priority": 50,
      "hasCredentials": false
    }
  ]
}
```

---

### 12. Update Logistics Provider

Update provider settings.

**Endpoint:** `PUT /api/admin/logistics-providers/:id`

**Authentication:** Required (Admin Only)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | Provider MongoDB ID |

**Request Body:**
```json
{
  "isActive": true,
  "priority": 100,
  "displayName": "Shiprocket Express",
  "averageDeliveryTime": 3,
  "supportsCOD": true,
  "supportsReverse": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isActive` | boolean | ❌ No | Enable/disable provider |
| `priority` | number | ❌ No | Provider priority (higher = preferred) |
| `displayName` | string | ❌ No | Display name |
| `averageDeliveryTime` | number | ❌ No | Average days for delivery |
| `supportsCOD` | boolean | ❌ No | COD support flag |
| `supportsReverse` | boolean | ❌ No | Reverse pickup support |

**Success Response (200):**
```json
{
  "success": true,
  "provider": {...}
}
```

---

### 13. Update Provider Credentials

Update provider API credentials (encrypted).

**Endpoint:** `PUT /api/admin/logistics-providers/:id/credentials`

**Authentication:** Required (Admin Only)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | Provider MongoDB ID |

**Request Body:**
```json
{
  "credentials": {
    "email": "your-shiprocket@email.com",
    "password": "your-api-password"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credentials` | object | ✅ Yes | Credentials object |
| `credentials.email` | string | ✅ Yes | Shiprocket email |
| `credentials.password` | string | ✅ Yes | Shiprocket password/API key |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Credentials saved securely"
}
```

---

### 14. Test Provider Connection

Test connection to a logistics provider.

**Endpoint:** `POST /api/admin/logistics-providers/:id/test`

**Authentication:** Required (Admin Only)

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | Provider MongoDB ID |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful"
}
```

**Error Response (200):**
```json
{
  "success": false,
  "error": "Authentication failed - invalid credentials"
}
```

---

## Status Mapping Reference

Shiprocket status to internal status mapping:

| Shiprocket Status | Internal Status |
|-------------------|-----------------|
| Pickup Scheduled | `pickup_scheduled` |
| Pickup Generated | `pickup_scheduled` |
| Out For Pickup | `pickup_scheduled` |
| Pickup Error | `pickup_pending` |
| Shipped | `in_transit` |
| In Transit | `in_transit` |
| Reached at Destination Hub | `in_transit` |
| Out For Delivery | `out_for_delivery` |
| Delivered | `delivered` |
| RTO Initiated | `return_to_origin` |
| RTO Delivered | `rto_delivered` |
| Cancelled | `cancelled` |
| Lost | `cancelled` |

---

## Error Response Format

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## Environment Variables

Required environment variables for Shiprocket integration:

| Variable | Description |
|----------|-------------|
| `SHIPROCKET_EMAIL` | Shiprocket account email |
| `SHIPROCKET_API` | Shiprocket API password |
| `SHIPROCKET_WEBHOOK_SECRET` | Optional webhook signature secret |
| `USE_MOCK_AWB` | Set to "true" for testing without KYC |
| `CREDENTIALS_ENCRYPTION_KEY` | 32-char key for encrypting stored credentials |

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/courier/check-serviceability` | POST | ❌ | Check pincode serviceability |
| `/api/courier/tracking/:awbCode` | GET | ❌ | Get tracking by AWB |
| `/api/courier/select-best` | POST | ❌ | Smart courier selection |
| `/api/courier/tracking/order/:orderId` | GET | 🔐 User | Get tracking by order ID |
| `/api/courier/create-user-shipment/:orderId` | POST | 🔐 User | Create shipment (user's order) |
| `/api/courier/create-shipment/:orderId` | POST | 🔐 Admin | Create shipment (any order) |
| `/api/courier/cancel-shipment/:orderId` | POST | 🔐 Admin | Cancel shipment |
| `/api/courier/pickup-locations` | GET | 🔐 Admin | Get pickup locations |
| `/api/courier/webhook` | POST | Webhook | Receive status updates |
| `/api/courier/webhook-test` | POST | ❌ | Test webhook |
| `/api/admin/logistics-providers` | GET | 🔐 Admin | List all providers |
| `/api/admin/logistics-providers/:id` | PUT | 🔐 Admin | Update provider |
| `/api/admin/logistics-providers/:id/credentials` | PUT | 🔐 Admin | Update credentials |
| `/api/admin/logistics-providers/:id/test` | POST | 🔐 Admin | Test connection |
