import mongoose from 'mongoose';

const designerSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    designerId: { type: String, required: true },
    roomName: { type: String, required: true },
    status: {
        type: String,
        enum: ['Scheduled', 'Active', 'Completed'],
        default: 'Scheduled'
    },
    startTime: Date,
    endTime: Date,
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    }
}, { timestamps: true });

const DesignerSession = mongoose.model('DesignerSession', designerSessionSchema);

export default DesignerSession;
