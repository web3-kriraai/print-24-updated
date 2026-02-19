import mongoose from 'mongoose';

const designerRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: false, // Optional - user might just want designer help without specific product
        },
        designerType: {
            type: String,
            enum: ['visual', 'physical'],
            default: 'visual',
            required: true,
        },
        designStatus: {
            type: String,
            enum: ['PendingDesign', 'InDesign', 'Completed', 'Cancelled'],
            default: 'PendingDesign',
            required: true,
        },
        designForm: {
            type: mongoose.Schema.Types.Mixed, // Flexible object for design requirements
            default: {},
        },
        assignedDesigner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DesignerSession',
            required: false,
        },
        notes: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Index for efficient querying
designerRequestSchema.index({ designStatus: 1, createdAt: 1 });
designerRequestSchema.index({ assignedDesigner: 1 });

const DesignerRequest = mongoose.model('DesignerRequest', designerRequestSchema);

export default DesignerRequest;
