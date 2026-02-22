import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Product from './src/models/productModal.js';
import { getShippingEstimate } from './src/controllers/shiprocket.controller.js';

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const p = await Product.findById("693f9c8f249a2481b79806df");
        if (!p) return console.log("No product");

        console.log("Found product! Ranges:", p.productionTimeRanges);

        // Mock req/res to test the controller
        const runTest = async (qty) => {
            console.log(`\nTesting qty: ${qty}`);
            const req = {
                body: { pincode: '400001', productId: p._id, quantity: qty }
            };
            const res = {
                status: (code) => {
                    return { json: (data) => console.log('STATUS', code, JSON.stringify(data, null, 2)) }
                },
                json: (data) => console.log('JSON', JSON.stringify(data, null, 2))
            };
            await getShippingEstimate(req, res);
        };

        await runTest(500);
        await runTest(5000); // Should fallback to max range 1-1000
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
