import mongoose from 'mongoose';

const serviceItemSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['product', 'category', 'subcategory'],
        required: true
    },
    id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'titles.items.type'
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, { _id: false });

const serviceTitleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    items: [serviceItemSchema]
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    color: {
        type: String,
        required: true,
        default: '#93357c',
        validate: {
            validator: function (v) {
                // Validate hex color or CSS color name
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v) || /^[a-zA-Z]+$/.test(v);
            },
            message: props => `${props.value} is not a valid color format!`
        }
    },
    sortOrder: {
        type: Number,
        default: 0,
        index: true
    },
    bannerImage: {
        type: String,
        default: ''
    },
    titles: [serviceTitleSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient sorting
serviceSchema.index({ sortOrder: 1, createdAt: -1 });

// Virtual for getting items count
serviceSchema.virtual('totalItems').get(function () {
    return this.titles.reduce((sum, title) => sum + title.items.length, 0);
});

// Method to reorder titles
serviceSchema.methods.reorderTitles = function (titleOrders) {
    titleOrders.forEach(({ titleId, sortOrder }) => {
        const title = this.titles.id(titleId);
        if (title) {
            title.sortOrder = sortOrder;
        }
    });
    return this.save();
};

// Static method to get all active services sorted
serviceSchema.statics.getActiveSorted = function () {
    return this.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
};

const Service = mongoose.model('Service', serviceSchema);

export default Service;
