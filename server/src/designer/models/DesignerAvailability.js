import mongoose from 'mongoose';

const designerAvailabilitySchema = new mongoose.Schema({
    designerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    // Working Hours
    inTime: {
        type: String, // "HH:mm" format (24-hour)
        default: '09:00'
    },
    outTime: {
        type: String, // "HH:mm" format (24-hour)
        default: '18:00'
    },
    // Duration in minutes
    slotDuration: {
        type: Number,
        default: 60,
        min: 15
    },
    // Break Duration in minutes
    breakDuration: {
        type: Number,
        default: 0,
        min: 0
    },
    // Weekly Schedule (Array of days 0-6 where 0 is Sunday, 6 is Saturday)
    // If a day is in this array, the designer is available
    weeklySchedule: {
        type: [Number],
        default: [1, 2, 3, 4, 5, 6] // Mon-Sat by default
    },
    // Dates where the designer is specifically disabled (YYYY-MM-DD)
    disabledDates: {
        type: [String],
        default: []
    }
}, { timestamps: true });

const DesignerAvailability = mongoose.model('DesignerAvailability', designerAvailabilitySchema);

export default DesignerAvailability;
