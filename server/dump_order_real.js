const mongoose = require('mongoose');
const fs = require('fs');

async function checkOrder() {
    await mongoose.connect('mongodb://localhost:27017/print24'); // Need to check actual mongo DB url from .env
    const db = mongoose.connection.db;
    const order = await db.collection('orders').findOne({});
    console.log("ORDER FIELDS ==========================");
    console.log(Object.keys(order));
    console.dir(order, { depth: 2 });
    process.exit(0);
}
checkOrder().catch(console.error);
