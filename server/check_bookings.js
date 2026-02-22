import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function checkBookings() {
    try {
        const uri = MONGO_URI.includes('?')
            ? MONGO_URI.replace('?', 'prints24?')
            : MONGO_URI.endsWith('/') ? MONGO_URI + 'prints24' : MONGO_URI + '/prints24';

        await mongoose.connect(uri);
        console.log('Connected to MongoDB:', uri.replace(/:([^@]+)@/, ':****@')); // Hide password

        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        for (const dbInfo of dbs.databases) {
            if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;

            console.log(`\n--- Checking Database: ${dbInfo.name} ---`);
            const currentDb = mongoose.connection.client.db(dbInfo.name);
            const collections = await currentDb.listCollections().toArray();
            const colNames = collections.map(c => c.name);
            console.log('Collections:', colNames);

            if (colNames.includes('orders')) {
                const orders = currentDb.collection('orders');
                const count = await orders.countDocuments();
                console.log(`Found 'orders' collection with ${count} documents.`);
                if (count > 0) {
                    const latest = await orders.find().sort({ createdAt: -1 }).limit(1).toArray();
                    console.log('Latest Order:', JSON.stringify(latest[0], null, 2));
                }
            }

            if (colNames.includes('physicaldesignerbookings')) {
                const bookings = currentDb.collection('physicaldesignerbookings');
                const count = await bookings.countDocuments();
                console.log(`Found 'physicaldesignerbookings' collection with ${count} documents.`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkBookings();
