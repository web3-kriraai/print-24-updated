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
    // Custom name for navbar (optional)
    navbarName: {
        type: String,
        default: '',
        trim: true
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
    // Icon configuration
    icon: {
        type: String,
        default: 'Printer',
        trim: true
    },
    navbarIcon: {
        type: String,
        default: '',
        trim: true
    },
    // Custom service heading and description for banner
    serviceHeading: {
        type: String,
        default: '',
        trim: true
    },
    serviceDescription: {
        type: String,
        default: '',
        trim: true
    },
    // Banner configuration
    bannerConfig: {
        title: {
            type: String,
            default: 'ORDER BOOK TODAY'
        },
        subtitle: {
            type: String,
            default: 'WIDE RANGE OF'
        },
        highlightText: {
            type: String,
            default: ''
        },
        // Four dynamic text sections for banner
        textSection1: {
            type: String,
            default: 'ORDER BOOK TODAY'
        },
        textSection2: {
            type: String,
            default: 'Personalized gifts for every occasion & corporate needs'
        },
        textSection3: {
            type: String,
            default: 'WIDE RANGE OF'
        },
        textSection4: {
            type: String,
            default: ''  // Defaults to service name
        },
        // Main banner icon
        mainIcon: {
            type: String,
            default: ''
        },
        // Secondary icons for banner decoration
        secondaryIcons: [{
            icon: {
                type: String,
                required: true
            },
            position: {
                type: String,
                enum: ['left', 'right', 'center'],
                default: 'left'
            },
            size: {
                type: Number,
                default: 24
            }
        }],
        // Decorative elements (dots/shapes)
        decorativeElements: [{
            shape: {
                type: String,
                enum: ['circle', 'square', 'triangle', 'star', 'hexagon'],
                default: 'circle'
            },
            top: String,
            bottom: String,
            left: String,
            right: String,
            size: {
                type: Number,
                default: 12
            },
            color: {
                type: String,
                default: '#93357c'
            },
            animation: {
                type: String,
                enum: ['float', 'pulse', 'spin', 'none'],
                default: 'float'
            }
        }],
        // Default shape for decorative elements
        defaultShape: {
            type: String,
            enum: ['circle', 'square', 'triangle', 'star', 'hexagon', 'random'],
            default: 'circle'
        },
        // Default size for decorative elements
        defaultShapeSize: {
            type: Number,
            default: 12
        },
        primaryColor: {
            type: String,
            default: ''
        },
        secondaryColor: {
            type: String,
            default: '#0ab2b5'
        },
        accentColor: {
            type: String,
            default: '#f79a1c'
        },
        // Color palette for multiple colors
        colorPalette: [{
            color: {
                type: String,
                required: true
            },
            name: {
                type: String,
                default: ''
            }
        }],
        showIcons: {
            type: Boolean,
            default: true
        },
        iconPositions: [{
            icon: String,
            top: String,
            bottom: String,
            left: String,
            right: String,
            size: {
                type: Number,
                default: 24
            },
            color: String,
            animation: {
                type: String,
                enum: ['float', 'pulse', 'none'],
                default: 'float'
            }
        }]
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
