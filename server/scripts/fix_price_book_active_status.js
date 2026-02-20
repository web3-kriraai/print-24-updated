import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import PriceBook from '../src/models/PriceBook.js';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        console.log('Checking for Price Books without isActive field...');

        // Find documents where isActive is missing (undefined)
        const booksMissingField = await PriceBook.find({ isActive: { $exists: false } });
        console.log(`Found ${booksMissingField.length} books missing 'isActive' field.`);

        if (booksMissingField.length > 0) {
            console.log('Updating...');
            const result = await PriceBook.updateMany(
                { isActive: { $exists: false } },
                { $set: { isActive: true } }
            );
            console.log(`Updated ${result.modifiedCount} documents.`);
        } else {
            console.log('No updates needed.');
        }

        // Just in case, force update Master Book if it's somehow false/null
        const master = await PriceBook.findOne({ isMaster: true });
        if (master) {
            console.log(`Master Book '${master.name}' isActive: ${master.isActive} (Type: ${typeof master.isActive})`);
            if (master.isActive !== true) {
                console.log('Forcing Master Book to active...');
                master.isActive = true;
                await master.save();
                console.log('Master Book updated.');
            }
        }

        // Verify
        const activeBooks = await PriceBook.countDocuments({ isActive: true });
        console.log(`Total Active Books now: ${activeBooks}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
