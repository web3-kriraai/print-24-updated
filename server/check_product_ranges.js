import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Product from './src/models/productModal.js';

const URI = process.env.MONGO_URI;

mongoose.connect(URI).then(async () => {
    const product = await Product.findOne({ name: /Paper Visiting Card/i });
    if (!product) { console.log("Product not found"); process.exit(1); }
    console.log("Product:", product.name);
    console.log("Ranges:", JSON.stringify(product.productionTimeRanges, null, 2));

    for (const qty of [500, 2400, 5000]) {
        const applicableRange = product.productionTimeRanges.find(
            r => qty >= r.minQuantity && (!r.maxQuantity || qty <= r.maxQuantity)
        ) || product.productionTimeRanges[product.productionTimeRanges.length - 1];
        console.log(`\nApplicable Range for ${qty}:`, applicableRange);
        const days = Number(applicableRange?.days) || 0;
        const hours = Number(applicableRange?.hours) || 0;
        let productionDays = Math.ceil(days + (hours / 24));
        if (productionDays === 0) productionDays = 1;
        console.log(`Computed Production Days for ${qty}:`, productionDays);
    }
    mongoose.disconnect();
}).catch(console.error);
