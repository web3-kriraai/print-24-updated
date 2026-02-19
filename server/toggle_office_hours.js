import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OfficeConfig from './src/designer/models/OfficeConfig.js';

dotenv.config();

const TOGGLE_ACTION = process.argv[2]; // 'open' or 'close'

async function toggleOfficeHours() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        let config = await OfficeConfig.findOne();

        if (!config) {
            console.log("No config found. Creating default...");
            config = await OfficeConfig.create({
                isOpen: true,
                startHour: 10, // 10 AM
                endHour: 19,   // 7 PM
                holidays: []
            });
        }

        if (TOGGLE_ACTION === 'close') {
            config.isOpen = false;
            console.log("Setting Office Status: CLOSED");
        } else if (TOGGLE_ACTION === 'open') {
            config.isOpen = true;
            console.log("Setting Office Status: OPEN");
        } else {
            console.log("Current Status:", config.isOpen ? "OPEN" : "CLOSED");
            console.log("Use 'node toggle_office_hours.js open' or 'node toggle_office_hours.js close' to change.");
        }

        await config.save();
        console.log("Office Configuration Updated.");

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

toggleOfficeHours();
