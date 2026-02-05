// Migration script to remove font fields from services and migrate to global fontSettings
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Service from './src/models/serviceModal.js';
import SiteSettings from './src/models/siteSettingsModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const migrateToGlobalFonts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Ensure SiteSettings has fontSettings with defaults
        console.log('\n📋 Step 1: Updating SiteSettings with global fontSettings...');
        let siteSettings = await SiteSettings.findOne();
        if (!siteSettings) {
            siteSettings = await SiteSettings.create({});
            console.log('   Created new SiteSettings document');
        }

        // Update only if fontSettings doesn't exist or is incomplete
        if (!siteSettings.fontSettings || !siteSettings.fontSettings.navbarNameFontSize) {
            await SiteSettings.updateOne(
                {},
                {
                    $set: {
                        fontSettings: {
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
                }
            );
            console.log('   ✅ Global fontSettings added to SiteSettings');
        } else {
            console.log('   ℹ️  SiteSettings already has fontSettings');
        }

        // Step 2: Remove font fields from all Service documents
        console.log('\n📋 Step 2: Removing per-service font fields...');
        const result = await Service.updateMany(
            {},
            {
                $unset: {
                    navbarNameFontSize: '',
                    navbarNameFontWeight: '',
                    cardIntroFontSize: '',
                    cardIntroFontWeight: '',
                    cardTitleFontSize: '',
                    cardTitleFontWeight: '',
                    cardDescFontSize: '',
                    cardDescFontWeight: ''
                }
            }
        );

        console.log(`   ✅ Removed font fields from ${result.modifiedCount} services`);

        // Step 3: Verify migration
        console.log('\n📋 Step 3: Verifying migration...');
        const verifySettings = await SiteSettings.findOne();
        console.log('   Global Font Settings:');
        console.log(`     - Navbar: ${verifySettings.fontSettings.navbarNameFontSize} / ${verifySettings.fontSettings.navbarNameFontWeight}`);
        console.log(`     - Card Title: ${verifySettings.fontSettings.cardTitleFontSize} / ${verifySettings.fontSettings.cardTitleFontWeight}`);

        const sampleService = await Service.findOne();
        if (sampleService) {
            const hasFontFields = sampleService.navbarNameFontSize !== undefined;
            if (hasFontFields) {
                console.log('   ⚠️  WARNING: Services still have font fields!');
            } else {
                console.log('   ✅ Services no longer have font fields');
            }
        }

        await mongoose.connection.close();
        console.log('\n✅ Migration complete!');
        console.log('\n📝 Summary:');
        console.log('   - Global font settings are now in SiteSettings');
        console.log('   - All services use global fonts (no per-service customization)');
        console.log('   - Font controls are now in Admin → Site Settings');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrateToGlobalFonts();
