import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function inspectProduct() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const productCollection = mongoose.connection.db.collection('products');
        const attrCollection = mongoose.connection.db.collection('attributetypes');

        const product = await productCollection.findOne({ name: /800 GSM \+ VELVET/i });
        if (!product) {
            console.log('Product not found');
            return;
        }

        console.log('Product ID:', product._id);
        console.log('Dynamic Attributes:', JSON.stringify(product.dynamicAttributes, null, 2));

        if (product.dynamicAttributes) {
            for (const da of product.dynamicAttributes) {
                const attrType = await attrCollection.findOne({ _id: da.attributeType });
                console.log('\n--- Attribute Type:', attrType?.attributeName, `(${da.attributeType}) ---`);
                console.log('Custom Values:', da.customValues);
                if (!da.customValues || da.customValues.length === 0) {
                    console.log('Using Global Values:', attrType?.attributeValues);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectProduct();
