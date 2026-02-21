import mongoose from 'mongoose';

/**
 * PhysicalDesignerBooking Model
 * 
 * Tracks the full lifecycle of a physical designer visit:
 * Scheduled → Accepted → InProgress → Completed / Cancelled
 * 
 * Key design decisions:
 * - productSnapshot: immutable copy of product details at booking time
 * - hourlyRate: snapshotted from designer profile at booking time (cannot be changed later)
 * - All billing is calculated backend-only (no client-side billing)
 */
const physicalDesignerBookingSchema = new mongoose.Schema(
    {
        // ─── PARTIES ──────────────────────────────────────────────────────────
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        designerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        // ─── ORDER REFERENCE ──────────────────────────────────────────────────
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true
        },

        // ─── PRODUCT SNAPSHOT (immutable at booking time) ─────────────────────
        // Stores product details as they were at the time of booking.
        // Even if the product changes later, this data remains unchanged.
        productSnapshot: {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            productName: { type: String, default: '' },
            variantName: { type: String, default: '' },
            quantity: { type: Number, default: 1 },
            printingType: { type: String, default: '' },
            spotUV: { type: Boolean, default: false },
            foilType: { type: String, default: '' },
            cuttingType: { type: String, default: '' },
            selectedOptions: { type: mongoose.Schema.Types.Mixed, default: {} },
            selectedDynamicAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
            uploadedFiles: [{ type: String }],
            specialInstructions: { type: String, default: '' },
            totalOrderAmount: { type: Number, default: 0 }
        },

        // ─── VISIT SCHEDULING ─────────────────────────────────────────────────
        visitDate: {
            type: Date,
            required: true,
            index: true
        },
        visitAddress: {
            type: String,
            default: ''
        },
        visitNotes: {
            type: String,
            default: ''
        },
        customerPhone: {
            type: String,
            required: [true, 'Customer phone number is required'],
            validate: {
                validator: (v) => /^(\+\d{1,3})?\d{10}$/.test(v.replace(/[\s\-]/g, '')),
                message: 'Invalid phone number format. Use 10 digits or international format (e.g. +91XXXXXXXXXX).'
            }
        },
        visitLocation: {
            type: String,
            enum: ['OFFICE', 'HOME'],
            default: 'OFFICE',
            required: true,
            index: true
        },
        timeSlot: {
            type: String,
            required: function () {
                return this.visitLocation === 'OFFICE';
            },
            index: true
        },
        homeVisitCharge: {
            type: Number,
            default: 0
        },
        isFullDay: {
            type: Boolean,
            default: false
        },

        // ─── VISIT STATUS LIFECYCLE ───────────────────────────────────────────
        // Scheduled → Accepted → InProgress → Completed / Cancelled
        visitStatus: {
            type: String,
            enum: ['Scheduled', 'Accepted', 'InProgress', 'Completed', 'Cancelled'],
            default: 'Scheduled',
            index: true
        },

        // ─── TIME TRACKING ────────────────────────────────────────────────────
        visitStartTime: {
            type: Date,
            default: null
        },
        visitEndTime: {
            type: Date,
            default: null
        },
        // Calculated when visit ends: Math.ceil((visitEndTime - visitStartTime) / 60000)
        totalDurationMinutes: {
            type: Number,
            default: 0
        },

        // ─── BILLING ──────────────────────────────────────────────────────────
        // hourlyRate is snapshotted from designer.hourlyRate at booking time.
        // It CANNOT be modified after booking is created.
        hourlyRate: {
            type: Number,
            required: true,
            min: 0
        },
        // baseAmount: any fixed charge (e.g., visit fee, travel charge) — optional
        baseAmount: {
            type: Number,
            default: 0
        },
        // totalAmount = (totalDurationMinutes / 60) × hourlyRate + baseAmount
        // Calculated backend-only when visit ends
        totalAmount: {
            type: Number,
            default: 0
        },
        // advancePaid: amount paid by customer at booking time
        advancePaid: {
            type: Number,
            default: 0,
            min: 0
        },
        // remainingAmount = totalAmount - advancePaid (calculated when visit ends)
        remainingAmount: {
            type: Number,
            default: 0
        },
        // paymentStatus: tracks overall payment state
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Partial', 'Paid'],
            default: 'Pending',
            index: true
        },

        // ─── CANCELLATION ─────────────────────────────────────────────────────
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        cancellationReason: {
            type: String,
            default: ''
        },
        cancelledAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true // createdAt, updatedAt
    }
);

// ─── INDEXES ──────────────────────────────────────────────────────────────────
// Unique index for Slot conflict (OFFICE ONLY)
// We use a partialFilterExpression because for HOME visits, timeSlot is undefined,
// and multiple undefineds would conflict in a standard unique index.
physicalDesignerBookingSchema.index(
    { designerId: 1, visitDate: 1, timeSlot: 1 },
    {
        unique: true,
        partialFilterExpression: { visitLocation: 'OFFICE' }
    }
);
physicalDesignerBookingSchema.index({ visitStatus: 1, visitDate: 1 });
physicalDesignerBookingSchema.index({ designerId: 1, visitStatus: 1 });
physicalDesignerBookingSchema.index({ customerId: 1, createdAt: -1 });

const PhysicalDesignerBooking = mongoose.model('PhysicalDesignerBooking', physicalDesignerBookingSchema);

export default PhysicalDesignerBooking;
