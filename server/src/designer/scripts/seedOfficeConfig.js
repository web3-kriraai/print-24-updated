import OfficeConfig from '../models/OfficeConfig.js';

export async function seedOfficeConfig() {
    try {
        const existing = await OfficeConfig.findOne();
        if (existing) {
            console.log("[Seed] OfficeConfig already exists.");
            return;
        }

        console.log("[Seed] Creating default OfficeConfig...");
        await OfficeConfig.create({
            isMaster: true,
            startHour: 10,
            endHour: 19,
            holidays: [],
            isOpen: true,
            officeName: 'Prints24 Design Studio',
            officeAddress: '',
            officePhone: ''
        });
        console.log("[Seed] ✅ OfficeConfig created (10 AM - 7 PM).");

    } catch (error) {
        // Ignore duplicate key error safely
        if (error.code === 11000) return;
        console.error("[Seed] Error seeding OfficeConfig:", error.message);
    }
}
