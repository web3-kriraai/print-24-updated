import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Product from './src/models/productModal.js';

const URI = process.env.MONGO_URI;

mongoose.connect(URI).then(async () => {
    const products = await Product.find({ name: /Paper Visiting Card/i });
    console.log(`Found ${products.length} products`);
    products.forEach(p => {
        console.log(`\nProduct ID: ${p._id}, Name: ${p.name}`);
        console.log(`Ranges: ${JSON.stringify(p.productionTimeRanges)}`);
    });
    mongoose.disconnect();
}).catch(console.error);
