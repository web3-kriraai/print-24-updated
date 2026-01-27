/**
 * Sub-Attributes Synchronization Script
 * 
 * This script fixes the hasSubAttributes flag on parent AttributeType values
 * when there are sub-attributes created but the flag is not properly set.
 * 
 * It addresses two scenarios:
 * 1. hasSubAttributes is false when it should be true (sub-attributes exist)
 * 2. Trailing dash/character mismatches between attribute values and sub-attribute parentValue
 * 
 * Run with: node sync-subattributes.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import AttributeType from './src/models/attributeTypeModal.js';
import SubAttribute from './src/models/subAttributeSchema.js';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set!');
  process.exit(1);
}

async function syncSubAttributes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all sub-attributes
    const allSubAttributes = await SubAttribute.find({ isEnabled: true }).lean();
    console.log(`\n📊 Found ${allSubAttributes.length} enabled sub-attributes`);

    // Group by parentAttribute
    const subAttrsByParent = {};
    allSubAttributes.forEach(subAttr => {
      const parentId = subAttr.parentAttribute.toString();
      if (!subAttrsByParent[parentId]) {
        subAttrsByParent[parentId] = new Set();
      }
      subAttrsByParent[parentId].add(subAttr.parentValue);
    });

    console.log(`\n🔍 Processing ${Object.keys(subAttrsByParent).length} parent attributes...`);

    let totalFixed = 0;
    let totalMismatches = 0;
    const mismatches = [];

    for (const [parentId, parentValues] of Object.entries(subAttrsByParent)) {
      const attributeType = await AttributeType.findById(parentId);
      
      if (!attributeType) {
        console.warn(`⚠️  Parent AttributeType ${parentId} not found!`);
        continue;
      }

      console.log(`\n📝 Checking: "${attributeType.attributeName}" (${parentId})`);
      console.log(`   Sub-attribute parentValues: ${[...parentValues].map(v => `"${v}"`).join(', ')}`);

      let modified = false;

      for (const parentValue of parentValues) {
        // Find exact match first
        let valueIndex = attributeType.attributeValues.findIndex(
          av => String(av.value).trim() === parentValue
        );

        // If not found, try fuzzy match (add/remove trailing dash, case insensitive)
        if (valueIndex === -1) {
          // Try without trailing dash
          const withoutDash = parentValue.replace(/-$/, '');
          // Try with trailing dash
          const withDash = parentValue + '-';
          
          valueIndex = attributeType.attributeValues.findIndex(av => {
            const avValue = String(av.value).trim();
            return avValue === withoutDash || 
                   avValue === withDash ||
                   avValue.toLowerCase() === parentValue.toLowerCase() ||
                   avValue.replace(/-$/, '') === parentValue ||
                   avValue === parentValue.replace(/-$/, '');
          });

          if (valueIndex !== -1) {
            const matchedValue = attributeType.attributeValues[valueIndex].value;
            console.log(`   ⚠️  Fuzzy match: parentValue="${parentValue}" → attrValue="${matchedValue}"`);
            
            mismatches.push({
              attributeName: attributeType.attributeName,
              parentValue: parentValue,
              actualValue: matchedValue,
              parentId: parentId
            });
            totalMismatches++;
          }
        }

        if (valueIndex !== -1) {
          const currentHasSubAttrs = attributeType.attributeValues[valueIndex].hasSubAttributes;
          
          if (currentHasSubAttrs !== true) {
            console.log(`   🔧 Fixing hasSubAttributes for "${attributeType.attributeValues[valueIndex].label}": ${currentHasSubAttrs} → true`);
            attributeType.attributeValues[valueIndex].hasSubAttributes = true;
            modified = true;
            totalFixed++;
          } else {
            console.log(`   ✓ "${attributeType.attributeValues[valueIndex].label}" already has hasSubAttributes=true`);
          }
        } else {
          console.log(`   ❌ No match found for parentValue="${parentValue}"`);
          console.log(`      Available values: ${attributeType.attributeValues.map(av => `"${av.value}"`).join(', ')}`);
        }
      }

      if (modified) {
        attributeType.markModified('attributeValues');
        await attributeType.save();
        console.log(`   💾 Saved changes to "${attributeType.attributeName}"`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total hasSubAttributes fixed: ${totalFixed}`);
    console.log(`Total value mismatches found: ${totalMismatches}`);

    if (mismatches.length > 0) {
      console.log('\n⚠️  VALUE MISMATCHES (sub-attribute parentValue doesn\'t match attribute value exactly):');
      console.log('-'.repeat(60));
      mismatches.forEach((m, i) => {
        console.log(`${i + 1}. Attribute: "${m.attributeName}"`);
        console.log(`   Sub-attribute parentValue: "${m.parentValue}"`);
        console.log(`   Actual attribute value: "${m.actualValue}"`);
        console.log(`   → Consider updating sub-attributes to use parentValue="${m.actualValue}"`);
      });
    }

    console.log('\n✅ Synchronization complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

syncSubAttributes();
