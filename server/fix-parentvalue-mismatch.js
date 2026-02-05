/**
 * Fix Sub-Attribute parentValue Mismatches
 * 
 * This script updates sub-attribute parentValue fields to match the exact
 * attribute values when there are trailing dash/character mismatches.
 * 
 * Run with: node fix-parentvalue-mismatch.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import AttributeType from './src/models/attributeTypeModal.js';
import SubAttribute from './src/models/subAttributeSchema.js';

const MONGO_TEST_URI = process.env.MONGO_TEST_URI;

if (!MONGO_TEST_URI) {
  console.error('❌ MONGO_TEST_URI environment variable is not set!');
  process.exit(1);
}

async function fixParentValueMismatches() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_TEST_URI);
    console.log('✅ Connected to MongoDB');

    // Get all sub-attributes
    const allSubAttributes = await SubAttribute.find({}).lean();
    console.log(`\n📊 Found ${allSubAttributes.length} sub-attributes`);

    // Group by parentAttribute
    const subAttrsByParent = {};
    allSubAttributes.forEach(subAttr => {
      const parentId = subAttr.parentAttribute.toString();
      if (!subAttrsByParent[parentId]) {
        subAttrsByParent[parentId] = [];
      }
      subAttrsByParent[parentId].push(subAttr);
    });

    let totalFixed = 0;

    for (const [parentId, subAttrs] of Object.entries(subAttrsByParent)) {
      const attributeType = await AttributeType.findById(parentId);

      if (!attributeType) {
        continue;
      }

      // Build a map of fuzzy matches to exact values
      const exactValuesMap = {};
      for (const av of attributeType.attributeValues) {
        const exactValue = String(av.value).trim();
        // Store normalized key -> exact value
        const normalizedKey = exactValue.replace(/-$/, '').toLowerCase();
        exactValuesMap[normalizedKey] = exactValue;

        // Also store exact match
        exactValuesMap[exactValue] = exactValue;
      }

      for (const subAttr of subAttrs) {
        const currentParentValue = subAttr.parentValue;

        // Check if exact match exists
        const exactMatch = attributeType.attributeValues.find(
          av => String(av.value).trim() === currentParentValue
        );

        if (!exactMatch) {
          // Try fuzzy matching
          const normalizedKey = currentParentValue.replace(/-$/, '').toLowerCase();
          const correctValue = exactValuesMap[normalizedKey] || exactValuesMap[currentParentValue + '-'];

          if (correctValue && correctValue !== currentParentValue) {
            console.log(`🔧 Fixing sub-attribute "${subAttr.value}" in "${attributeType.attributeName}"`);
            console.log(`   parentValue: "${currentParentValue}" → "${correctValue}"`);

            await SubAttribute.findByIdAndUpdate(subAttr._id, {
              parentValue: correctValue
            });
            totalFixed++;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total parentValue mismatches fixed: ${totalFixed}`);
    console.log('\n✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixParentValueMismatches();
