// Quick Test Script - Check if Prices Exist
// Run this in MongoDB Compass or mongo shell

// 1. Check if you have any Price Book Entries
db.pricebookentries.find().pretty()

// 2. Check if you have User Segments
db.usersegments.find().pretty()

// 3. Check your current product ID
// Replace with the actual product ID from the URL
const productId = "694677bd881195cf87437620"; // REPLACE THIS

// 4. Check if this product has any prices
db.pricebookentries.find({ product: ObjectId(productId) }).pretty()

// 5. If no results, you need to create a price entry:
// First, get the RETAIL segment ID
const retailSegment = db.usersegments.findOne({ code: "RETAIL" });
console.log("RETAIL Segment:", retailSegment);

// Then create a price entry
db.pricebookentries.insertOne({
  product: ObjectId(productId),
  userSegment: retailSegment._id,
  basePrice: 5000,  // Set your base price here
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

console.log("✅ Price entry created!");

// 6. Verify it was created
db.pricebookentries.find({ product: ObjectId(productId) }).pretty()
