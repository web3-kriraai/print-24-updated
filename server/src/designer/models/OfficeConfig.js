import mongoose from 'mongoose';

const officeConfigSchema = new mongoose.Schema({
    // Singleton ID (we typically just use one doc, but can force ID or just check count)
    isMaster: { type: Boolean, default: true, unique: true },

    startHour: { type: Number, default: 9 }, // 0-23
    endHour: { type: Number, default: 20 },   // 0-23

    holidays: [{ type: String }], // ["2024-12-25", "2024-01-01"]

    isOpen: { type: Boolean, default: true }, // Master switch override

    // ─── OFFICE IDENTITY (Admin-managed) ─────────────────────────────────
    officeName: { type: String, default: 'Prints24 Design Studio' },
    officeAddress: { type: String, default: '' },
    officePhone: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const OfficeConfig = mongoose.model('OfficeConfig', officeConfigSchema);

export default OfficeConfig;
