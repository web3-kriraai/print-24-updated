import mongoose from 'mongoose';

const designerSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },

    designerId: {
        type: String,
        required: true,
        index: true
    },

    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },

    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DesignerRequest',
        index: true
    },

    roomName: {
        type: String,
        required: true,
        unique: true
    },

    roomId: {
        type: String
    },

    status: {
        type: String,
        enum: ['Scheduled', 'Active', 'Paused', 'Completed', 'Cancelled'],
        default: 'Scheduled',
        index: true
    },
    startTime: Date,
    endTime: Date,

    totalDuration: {
        type: Number,
        default: 0
    },

    ratePerMinute: {
        type: Number,
        default: 0
    },

    totalAmount: {
        type: Number,
        default: 0
    },

    // Revenue Tracking & Snapshots
    baseDuration: { type: Number, default: 900 },
    basePrice: { type: Number, default: 500 },
    extensionDuration: { type: Number, default: 900 },
    extensionPrice: { type: Number, default: 300 },

    extendedDuration: { type: Number, default: 0 },
    transactions: [{
        paymentId: String,
        amount: Number,
        addedDuration: Number,
        timestamp: { type: Date, default: Date.now }
    }],
    gracePeriodSeconds: { type: Number, default: 300 }, // Allow extension 5 mins after finish
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    }
}, { timestamps: true });

const DesignerSession = mongoose.model('DesignerSession', designerSessionSchema);

export default DesignerSession;
