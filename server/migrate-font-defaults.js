// Migration script to add default font values to existing services
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Service from './src/models/serviceModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const migrateFontDefaults = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Update all services that have null font values
        const result = await Service.updateMany(
            {
                $or: [
                    { navbarNameFontSize: null },
                    { navbarNameFontWeight: null },
                    { cardIntroFontSize: null },
                    { cardIntroFontWeight: null },
                    { cardTitleFontSize: null },
                    { cardTitleFontWeight: null },
                    { cardDescFontSize: null },
                    { cardDescFontWeight: null }
                ]
            },
            {
                $set: {
                    navbarNameFontSize: '14px',
                    navbarNameFontWeight: '600',
                    cardIntroFontSize: '12px',
                    cardIntroFontWeight: '400',
                    cardTitleFontSize: '24px',
                    cardTitleFontWeight: '700',
                    cardDescFontSize: '14px',
                    cardDescFontWeight: '400'
                }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} services with default font values`);

        // Verify the update
        const services = await Service.find({}).select('name navbarNameFontSize cardTitleFontSize');
        console.log('\n📋 Sample services after migration:');
        services.slice(0, 3).forEach(s => {
            console.log(`  - ${s.name}: navbarFont=${s.navbarNameFontSize}, titleFont=${s.cardTitleFontSize}`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrateFontDefaults();
