import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config();

// IMPORT ALL MODELS to avoid MissingSchemaErrors
import Order from './src/models/orderModal.js';
import Product from './src/models/productModal.js';
import Category from './src/models/categoryModal.js';
import { User } from './src/models/User.js';
import UserSegment from './src/models/UserSegment.js';
import BulkOrder from './src/models/BulkOrder.js';

import * as bulkOrderService from './src/services/bulkOrderService.js';
import { triggerBulkProcessingIfNeeded } from './src/controllers/webhook.controller.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://print24:XdTuxSHbxpp6JAUt@cluster0.azagder.mongodb.net/prints24';
const ORDER_ID = process.argv[2];
const PATCH_URL = process.argv[3]; // Optional: Provide a URL if it's missing in DB

if (!ORDER_ID) {
    console.error('Usage: node reprocess_order.js <order_id> [optional_patch_pdf_url]');
    process.exit(1);
}

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        // Fetch the order
        const order = await Order.findById(ORDER_ID);
        if (!order) {
            console.error('❌ Order not found');
            process.exit(1);
        }

        console.log('📋 Order Number:', order.orderNumber);
        console.log('📦 isBulkParent:', order.isBulkParent);
        
        let fileUrl = order.uploadedDesign?.pdfFile?.url || order.uploadedDesign?.frontImage?.url || order.uploadedDesign?.url;
        
        if (!fileUrl && PATCH_URL) {
            console.log('🩹 Patching missing URL with:', PATCH_URL);
            if (!order.uploadedDesign) order.uploadedDesign = {};
            if (!order.uploadedDesign.pdfFile) order.uploadedDesign.pdfFile = {};
            order.uploadedDesign.pdfFile.url = PATCH_URL;
            order.uploadedDesign.pdfFile.filename = "patched_design.pdf";
            order.uploadedDesign.pdfFile.pageCount = order.uploadedDesign.pdfFile.pageCount || 1;
            
            // Save the patch to DB
            await Order.findByIdAndUpdate(ORDER_ID, { uploadedDesign: order.uploadedDesign });
            console.log('✅ Order patched in database');
            fileUrl = PATCH_URL;
        }

        if (!fileUrl) {
            console.error('❌ ERROR: This order has no design URL. Bulk processing will fail.');
            console.error('   Please provide a PATCH URL as the second argument.');
            process.exit(1);
        }

        console.log('📎 Design URL:', fileUrl);

        if (!order.isBulkParent) {
            console.error('❌ Order is not marked as a bulk parent!');
            process.exit(1);
        }

        // Trigger processing
        console.log('🚀 Triggering bulk processing...');
        await triggerBulkProcessingIfNeeded(order);
        
        console.log('✅ Processing triggered successfully.');
        console.log('Check server logs for background splitting progress.');
        
        // Wait for async processes to kick off
        setTimeout(() => {
            mongoose.disconnect();
            process.exit(0);
        }, 3000);

    } catch (err) {
        console.error('💥 Execution failed:', err);
        process.exit(1);
    }
}

run();
