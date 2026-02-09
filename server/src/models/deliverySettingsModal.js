import mongoose from 'mongoose';

const deliverySettingsSchema = new mongoose.Schema({
    // Buffer days for safety margin
    bufferDays: {
        type: Number,
        default: 1,
        min: 0,
        max: 30,
    },

    // Non-working days (holidays)
    holidays: [{
        date: {
            type: Date,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        recurring: {
            type: Boolean,
            default: false, // If true, applies every year
        },
    }],

    // Geographic zone mappings for internal delivery
    geoZoneMappings: [{
        zoneName: {
            type: String,
            required: true, // e.g., "Zone A", "Zone B"
        },
        pincodes: [{
            type: String, // Support both exact pincodes and ranges
        }],
        deliveryDays: {
            type: Number,
            required: true,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    }],

    // Courier preference
    courierPreference: {
        type: String,
        enum: ['internal', 'external', 'hybrid'],
        default: 'external',
    },

    // Default logistics days if no zone match and external API fails
    defaultLogisticsDays: {
        type: Number,
        default: 3,
    },

    // Weekend handling
    skipWeekends: {
        type: Boolean,
        default: true, // If true, EDD skips Saturdays and Sundays
    },

    // Updated by admin
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

}, {
    timestamps: true,
});

// Singleton pattern - only one settings document
deliverySettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({
            bufferDays: 1,
            courierPreference: 'external',
            defaultLogisticsDays: 3,
            skipWeekends: true,
        });
    }
    return settings;
};

const DeliverySettings = mongoose.model('DeliverySettings', deliverySettingsSchema);

export default DeliverySettings;
