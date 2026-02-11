/**
 * Database Fix Script - Drop Obsolete poNumber Index
 * 
 * This script removes the old 'poNumber_1' unique index from the bulkorders collection
 * which is causing E11000 duplicate key errors.
 * 
 * Run this in your MongoDB shell or via Node.js
 */

// MongoDB Shell Command:
// Connect to your database and run:
db.bulkorders.dropIndex("poNumber_1");

// OR if you want to drop all indexes except _id (use carefully):
// db.bulkorders.dropIndexes();

// Then recreate the correct indexes (these match your current schema):
db.bulkorders.createIndex({ "user": 1, "createdAt": -1 });
db.bulkorders.createIndex({ "status": 1 });
db.bulkorders.createIndex({ "orderNumber": 1 }, { unique: true });
db.bulkorders.createIndex({ "parentOrderId": 1 });
