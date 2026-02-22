import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Product from './src/models/productModal.js';
import { getShippingEstimate } from './src/controllers/shiprocket.controller.js';

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const p = await Product.findOne().select('_id name');
        if (!p) return console.log("No product");

        await Product.findByIdAndUpdate(p._id, {
            productionTimeRanges: [{ minQuantity: 1, maxQuantity: 1000, days: 1, hours: 10 }]
        });

        console.log("Updated product", p._id, "with 1d 10h");

        // Mock req/res to test the controller
        const req = {
            body: { pincode: '400001', productId: p._id, quantity: 500 }
        };
        const res = {
            status: (code) => ({ json: (data) => console.log('STATUS', code, data) }),
            json: (data) => console.log('JSON', JSON.stringify(data, null, 2))
        };

        await getShippingEstimate(req, res);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
