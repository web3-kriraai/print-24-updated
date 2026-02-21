import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Product from './src/models/productModal.js';

mongoose.connect('mongodb://127.0.0.1:27017/kriraai_db').then(async () => {
    try {
        const products = await Product.find({ 'productionTimeRanges.0': { $exists: true } }).select('_id name productionTimeRanges').limit(2).lean();
        console.log("Found products:", JSON.stringify(products, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
});
