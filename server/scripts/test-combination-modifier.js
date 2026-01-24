import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PriceModifier from '../src/models/PriceModifier.js';

dotenv.config();

/**
 * Test Combination Modifier Script
 * Creates and tests a COMBINATION modifier with complex AND/OR conditions
 */

async function testCombinationModifier() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_TEST_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create Florida Visiting Card Promo
    console.log('📝 Creating COMBINATION modifier...');
    const combinationModifier = await PriceModifier.create({
      name: "Florida Visiting Card Promo",
      description: "5% discount for visiting cards in Florida for retail/VIP customers or bulk orders",
      appliesTo: "COMBINATION",
      conditions: {
        AND: [
          {
            field: "geo_zone",
            operator: "EQUALS",
            value: "FLORIDA_ZONE_ID"  // Replace with actual zone ID
          },
          {
            field: "category",
            operator: "EQUALS",
            value: "VISITING_CARDS_CATEGORY_ID"  // Replace with actual category ID
          },
          {
            OR: [
              {
                field: "user_segment",
                operator: "IN",
                value: ["RETAIL", "VIP"]
              },
              {
                field: "quantity",
                operator: "GT",
                value: 500
              }
            ]
          }
        ]
      },
      modifierType: "PERCENT_DEC",
      value: 5, // 5% discount
      appliesOn: "UNIT",
      priority: 10,
      isStackable: true,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
      reason: "Promotional campaign for Florida market"
    });

    console.log(`✅ Created combination modifier:`);
    console.log(`   ID: ${combinationModifier._id}`);
    console.log(`   Name: ${combinationModifier.name}`);
    console.log(`   Type: ${combinationModifier.appliesTo}`);
    console.log(`   Discount: ${combinationModifier.value}%`);
    console.log(`   Conditions:`, JSON.stringify(combinationModifier.conditions, null, 2));
    console.log('');

    // Test Case 1: Should MATCH (VIP user in Florida)
    console.log('🧪 Test Case 1: VIP user in Florida buying visiting cards');
    const testContext1 = {
      productId: "TEST_PRODUCT_ID",
      geoZoneId: "FLORIDA_ZONE_ID",
      userSegmentId: "VIP",
      categoryId: "VISITING_CARDS_CATEGORY_ID",
      quantity: 100,
      subtotal: 5000
    };

    const matches1 = combinationModifier.matchesContext(testContext1);
    console.log(`   Result: ${matches1 ? '✅ MATCHES (discount should apply)' : '❌ NO MATCH'}\n`);

    // Test Case 2: Should MATCH (Bulk order in Florida)
    console.log('🧪 Test Case 2: Bulk order (600 units) in Florida');
    const testContext2 = {
      productId: "TEST_PRODUCT_ID",
      geoZoneId: "FLORIDA_ZONE_ID",
      userSegmentId: "WHOLESALE",
      categoryId: "VISITING_CARDS_CATEGORY_ID",
      quantity: 600,
      subtotal: 30000
    };

    const matches2 = combinationModifier.matchesContext(testContext2);
    console.log(`   Result: ${matches2 ? '✅ MATCHES (discount should apply)' : '❌ NO MATCH'}\n`);

    // Test Case 3: Should NOT MATCH (Wrong zone)
    console.log('🧪 Test Case 3: VIP user in California (wrong zone)');
    const testContext3 = {
      productId: "TEST_PRODUCT_ID",
      geoZoneId: "CALIFORNIA_ZONE_ID",
      userSegmentId: "VIP",
      categoryId: "VISITING_CARDS_CATEGORY_ID",
      quantity: 100,
      subtotal: 5000
    };

    const matches3 = combinationModifier.matchesContext(testContext3);
    console.log(`   Result: ${matches3 ? '✅ MATCHES' : '❌ NO MATCH (correct - wrong zone)'}\n`);

    // Test Case 4: Should NOT MATCH (Wrong category)
    console.log('🧪 Test Case 4: VIP user in Florida buying different product');
    const testContext4 = {
      productId: "TEST_PRODUCT_ID",
      geoZoneId: "FLORIDA_ZONE_ID",
      userSegmentId: "VIP",
      categoryId: "BROCHURES_CATEGORY_ID",
      quantity: 100,
      subtotal: 5000
    };

    const matches4 = combinationModifier.matchesContext(testContext4);
    console.log(`   Result: ${matches4 ? '✅ MATCHES' : '❌ NO MATCH (correct - wrong category)'}\n`);

    // Summary
    console.log('📊 Test Summary:');
    console.log(`   Test 1 (VIP in FL): ${matches1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Test 2 (Bulk in FL): ${matches2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Test 3 (Wrong zone): ${!matches3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Test 4 (Wrong category): ${!matches4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (matches1 && matches2 && !matches3 && !matches4) {
      console.log('🎉 SUCCESS: All tests passed! COMBINATION modifier working correctly.');
    } else {
      console.log('⚠️ WARNING: Some tests failed. Check the logic.');
    }

    console.log('\n✅ Test complete. Modifier ID:', combinationModifier._id);
    console.log('💡 Use this ID to test with the pricing API');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testCombinationModifier();
