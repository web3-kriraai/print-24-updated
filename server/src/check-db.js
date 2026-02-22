import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function checkDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Feature = mongoose.model('Feature', new mongoose.Schema({ key: String, configSchema: mongoose.Schema.Types.Mixed }, { strict: false }));
        const features = await Feature.find({ key: { $in: ['bulk_order_upload', 'bulk_feature_mgmt'] } });
        console.log(JSON.stringify(features, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDB();
