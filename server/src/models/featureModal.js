import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema(
    {
        icon: {
            type: String,
            required: true,
            default: 'Tag',
        },
        iconImage: {
            type: String,
            default: '',
        },
        iconShape: {
            type: String,
            enum: ['circle', 'square', 'rounded', ''],
            default: '',
        },
        iconBackgroundColor: {
            type: String,
            default: '',
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            required: true,
            default: '#00aeef',
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Feature = mongoose.model('Feature', featureSchema);

export default Feature;
