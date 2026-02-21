import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Product from './src/models/productModal.js';

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const products = await Product.find({
            'productionTimeRanges.0': { $exists: true }
        }).select('_id name productionTimeRanges').lean();

        console.log(`Found ${products.length} products with time ranges`);

        if (products.length > 0) {
            console.log(JSON.stringify(products[0], null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
