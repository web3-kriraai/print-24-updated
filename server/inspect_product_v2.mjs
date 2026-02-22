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

        console.log('\n=== PRODUCT INFO ===');
        console.log('Name:', product.name);
        console.log('Base Price:', product.basePrice);

        if (product.dynamicAttributes) {
            for (const da of product.dynamicAttributes) {
                const attrType = await attrCollection.findOne({ _id: da.attributeType });
                console.log(`\n[${attrType?.attributeName}] (${da.attributeType})`);

                const values = da.customValues && da.customValues.length > 0
                    ? da.customValues
                    : attrType?.attributeValues || [];

                values.forEach(v => {
                    console.log(`  - Value: ${v.value} | Label: ${v.label}`);
                    console.log(`    PriceAdd: ${v.priceAdd} | Multiplier: ${v.priceMultiplier}`);
                    console.log(`    Description: ${v.description}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectProduct();
