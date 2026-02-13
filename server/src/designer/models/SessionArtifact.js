import mongoose from 'mongoose';

const sessionArtifactSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DesignerSession'
    },
    type: {
        type: String,
        enum: ['Note', 'Chat_Log', 'Recording_URL', 'Reference_Image']
    },
    content: String
}, { timestamps: true });

const SessionArtifact = mongoose.model('SessionArtifact', sessionArtifactSchema);

export default SessionArtifact;
