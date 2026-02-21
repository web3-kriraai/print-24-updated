import mongoose from 'mongoose';

const sessionArtifactSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DesignerSession',
            required: true,
            index: true
        },

        userId: {
            type: String,
            required: true,
            index: true
        },

        createdBy: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: [
                'Note',
                'Chat',
                'Recording',
                'Reference'
            ],
            required: true
        },

        content: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

const SessionArtifact = mongoose.model(
    'SessionArtifact',
    sessionArtifactSchema
);

export default SessionArtifact;
