# 3PL External Logistics Integration - Complete Guide

## Overview

This document explains the complete flow of external logistics (3PL) integration and what changes are needed after payment integration.

---

## Current Implementation Status

### ✅ Already Implemented

1. **Shiprocket Service Integration**
   - API authentication
   - Order creation
   - AWB generation (with mock fallback)
   - Pickup requests
   - Tracking by AWB and Order ID
   - Smart courier routing

2. **Webhook Integration**
   - Real-time status updates
   - Status mapping
   - Timeline tracking
   - Database updates

3. **Database Schema**
   - AWB code storage
   - Shiprocket order/shipment IDs
   - Courier status tracking
   - Timeline entries

4. **Test Scripts**
   - Complete E2E flow testing
   - AWB tracking testing
   - Webhook testing

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER PLACES ORDER                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Order Creation                                         │
│  - Customer selects product & options                           │
│  - Enters delivery details                                      │
│  - Order saved to database (status: 'request')                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Payment Processing                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Payment Gateway (Razorpay/Stripe/PhonePe)                │  │
│  │  - Customer pays online                                   │  │
│  │  - Payment webhook received                               │  │
│  │  - Payment status updated: 'completed'                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  - Order status: 'request' → 'approved'                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Production Workflow (if applicable)                    │
│  - Design approval                                              │
│  - File preparation                                             │
│  - Department-wise production                                   │
│  - Quality check                                                │
│  - Order status: 'approved' → 'processing' → 'completed'        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Logistics Integration (3PL)    ← WE ARE HERE           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4.1: Check Serviceability                                │  │
│  │  - Query Shiprocket API                                   │  │
│  │  - Get available couriers for route                       │  │
│  │  - Smart routing selects best courier                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4.2: Create Shiprocket Order                             │  │
│  │  - Send order details to Shiprocket                       │  │
│  │  - Receive Shiprocket Order ID & Shipment ID              │  │
│  │  - Save to database                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4.3: Generate AWB Code                                   │  │
│  │  - Request AWB from Shiprocket                            │  │
│  │  - Receive AWB code & courier details                     │  │
│  │  - Save to database                                       │  │
│  │  - Courier Status: 'pickup_pending'                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4.4: Request Pickup                                      │  │
│  │  - Request courier pickup from warehouse                  │  │
│  │  - Courier Status: 'pickup_scheduled'                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Shipment Tracking (Real-time via Webhooks)            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Webhook Events from Courier Partner:                     │  │
│  │  1. Pickup Scheduled → 'pickup_scheduled'                 │  │
│  │  2. Shipped → 'in_transit'                                │  │
│  │  3. In Transit → 'in_transit'                             │  │
│  │  4. Out for Delivery → 'out_for_delivery'                 │  │
│  │  5. Delivered → 'delivered'                               │  │
│  │  - Each update saved to courierTimeline                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Delivery Confirmation                                  │
│  - Courier Status: 'delivered'                                  │
│  - Order Status: 'completed'                                    │
│  - deliveredAt timestamp set                                    │
│  - Customer notified (optional: email/SMS)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration After Payment

### Current State

**Before Payment Integration:**
- Orders created but require manual status updates
- Production workflow can't start automatically
- Logistics integration manual

**After Payment Integration:**
- ✅ Payment webhook triggers automatic order approval
- ✅ Production can start automatically
- ✅ Logistics can be triggered automatically

---

## Changes Needed After Payment Integration

### 1. Payment Webhook Handler

**File:** `server/src/controllers/paymentWebhook.controller.js`

**Current flow:**
```javascript
// When payment webhook received
paymentStatus = 'completed'
// Manual logistics trigger required
```

**Enhanced flow needed:**
```javascript
// When payment webhook received
async function handlePaymentSuccess(orderId, paymentData) {
    // 1. Update payment status
    order.paymentStatus = 'completed';
    order.paymentMethod = paymentData.method;
    
    // 2. Update order status
    order.status = 'approved'; // Ready for production
    
    // 3. Auto-trigger logistics (NEW)
    if (order.needsProduction) {
        // Start production workflow
        await productionService.initiate(order);
    } else {
        // Direct to logistics
        await logisticsService.createShipment(order);
    }
}
```

### 2. Logistics Service Trigger

**New File Needed:** `server/src/services/logistics/LogisticsService.js`

```javascript
class LogisticsService {
    async createShipment(order) {
        // 1. Check serviceability
        const serviceability = await shiprocketService.checkServiceability(
            pickupPincode,
            order.pincode,
            order.weight,
            order.paymentMethod
        );
        
        // 2. Create Shiprocket order
        const shipment = await shiprocketService.createOrder(orderData);
        
        // 3. Generate AWB
        const awb = await shiprocketService.generateAWB(
            shipment.shiprocketShipmentId,
            serviceability.recommendedCourier.courierId
        );
        
        // 4. Request pickup
        await shiprocketService.requestPickup(shipment.shiprocketShipmentId);
        
        // 5. Update order
        order.shiprocketOrderId = shipment.shiprocketOrderId;
        order.shiprocketShipmentId = shipment.shiprocketShipmentId;
        order.awbCode = awb.awbCode;
        order.courierPartner = awb.courierName;
        order.courierStatus = 'pickup_scheduled';
        await order.save();
        
        return shipment;
    }
}
```

### 3. Production Completion Hook

**File:** `server/src/services/production/ProductionService.js`

**Add after production completion:**
```javascript
async function completeProduction(orderId) {
    // Existing production completion logic
    order.status = 'completed'; // Production completed
    order.productionCompletedAt = new Date();
    await order.save();
    
    // NEW: Auto-trigger logistics
    await logisticsService.createShipment(order);
}
```

### 4. Order Controller Updates

**File:** `server/src/controllers/orderController.js`

**Add new endpoint:**
```javascript
// Trigger logistics manually (admin only)
export const triggerLogistics = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.paymentStatus !== 'completed') {
            return res.status(400).json({ 
                message: 'Payment must be completed first' 
            });
        }
        
        const shipment = await logisticsService.createShipment(order);
        
        res.json({
            success: true,
            message: 'Logistics initiated',
            shipment
        });
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
```

### 5. Admin UI Updates

**Frontend Changes Needed:**

1. **Order Details Page**
   - Show "Trigger Logistics" button if payment completed
   - Display AWB code when generated
   - Show tracking timeline

2. **Order List Page**
   - Add courier status column
   - Filter by courier status

---

## Configuration Changes

### Environment Variables (.env)

**Add these after payment integration:**

```env
# Logistics Configuration
AUTO_TRIGGER_LOGISTICS=true  # Auto-trigger after payment/production
DEFAULT_PICKUP_LOCATION=Primary
DEFAULT_WAREHOUSE_PINCODE=395006

# Webhook URLs
PAYMENT_WEBHOOK_URL=https://yourdomain.com/api/webhooks/payment
COURIER_WEBHOOK_URL=https://yourdomain.com/api/webhooks/courier-update

# Production Mode
USE_MOCK_AWB=false  # Set to true for testing
```

---

## Testing Checklist

### Before Going Live

- [ ] Payment integration complete
- [ ] Shiprocket KYC approved
- [ ] Webhook endpoint publicly accessible
- [ ] Test complete flow:
  - [ ] Order creation
  - [ ] Payment processing
  - [ ] Production completion
  - [ ] Logistics trigger
  - [ ] AWB generation
  - [ ] Webhook reception
  - [ ] Status tracking

### Test Scripts Available

```bash
# Test complete E2E flow
node src/scripts/test-complete-e2e-flow.js

# Test AWB tracking
node src/scripts/test-awb-tracking.js <AWB_CODE>

# Test webhook integration
node src/scripts/test-webhook.js <ORDER_NUMBER>
```

---

## Database Schema Updates

### No Schema Changes Required ✅

The Order model already has all fields needed:
- `paymentStatus` - Payment tracking
- `shiprocketOrderId` - Shiprocket order reference
- `shiprocketShipmentId` - Shiprocket shipment reference
- `awbCode` - Tracking number
- `courierPartner` - Courier company name
- `courierStatus` - Current courier status
- `courierTimeline` - Status history

---

## API Endpoints

### Existing Endpoints ✅

```
POST   /api/orders                    # Create order
GET    /api/orders/:id                # Get order details
GET    /api/orders/:id/tracking       # Get tracking info
POST   /api/webhooks/courier-update   # Courier webhook
```

### New Endpoints Needed

```
POST   /api/orders/:id/trigger-logistics  # Manual logistics trigger (admin)
GET    /api/orders/:id/awb               # Get AWB details
POST   /api/orders/:id/retry-shipment    # Retry failed shipment
```

---

## Error Handling

### Common Scenarios

1. **Payment Failed**
   - Order status remains 'request'
   - Logistics not triggered
   - Customer can retry payment

2. **Serviceability Check Failed**
   - Notify admin
   - Manual courier selection required
   - Fallback to internal delivery

3. **AWB Generation Failed**
   - Falls back to mock AWB (if enabled)
   - Logs error for admin review
   - Can retry manually

4. **Webhook Not Received**
   - Manual status check available
   - Admin can trigger status sync
   - Tracking API fallback

---

## Production Deployment Checklist

### Infrastructure

- [ ] Server publicly accessible
- [ ] HTTPS enabled
- [ ] Webhook endpoint verified
- [ ] Database backup configured

### Shiprocket Setup

- [ ] KYC completed and approved
- [ ] Pickup locations added
- [ ] Webhook URL configured
- [ ] Webhook events selected

### Application Setup

- [ ] Payment gateway integrated
- [ ] Environment variables set
- [ ] Logistics service implemented
- [ ] Production hooks added
- [ ] Error logging enabled
- [ ] Admin notifications configured

---

## Summary

### What Changes After Payment Integration

**Automatic Flow:**
```
Payment Success → Order Approved → [Production (if needed)] → 
Logistics Auto-Triggered → AWB Generated → Pickup Scheduled → 
Tracking via Webhooks → Delivered
```

**Manual Intervention Reduced:**
- Payment verification ✅ Auto
- Logistics triggering ✅ Auto
- AWB generation ✅ Auto
- Status updates ✅ Auto (via webhooks)

**Admin Actions Required:**
- Configure Shiprocket account (one-time)
- Set webhook URL (one-time)
- Handle exceptions/errors only

---

## Quick Reference

### Files to Create/Modify

**Create:**
- `src/services/logistics/LogisticsService.js`
- `src/controllers/logisticsController.js`

**Modify:**
- `src/controllers/paymentWebhook.controller.js`
- `src/services/production/ProductionService.js`
- `src/controllers/orderController.js`
- `src/routes/orderRoutes.js`

**Configure:**
- `.env` - Add logistics settings
- Shiprocket Dashboard - Add webhook URL

---

**Ready for Integration!** All core logistics functionality is implemented. Just need to connect payment webhooks to logistics triggers.
