import Product from './server/src/models/productModal.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Generate slug from name
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Add slugs to all products
async function addSlugsToProducts() {
    try {
        await connectDB();

        const products = await Product.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });

        console.log(`Found ${products.length} products without slugs`);

        for (const product of products) {
            const baseSlug = generateSlug(product.name);
            let slug = baseSlug;
            let counter = 1;

            // Check for uniqueness within scope
            while (true) {
                const query = product.subcategory
                    ? { slug, subcategory: product.subcategory, _id: { $ne: product._id } }
                    : { slug, category: product.category, subcategory: null, _id: { $ne: product._id } };

                const exists = await Product.findOne(query);
                if (!exists) break;

                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            product.slug = slug;
            await product.save();
            console.log(`✓ Added slug "${slug}" to product: ${product.name}`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log(`Total products updated: ${products.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
addSlugsToProducts();
