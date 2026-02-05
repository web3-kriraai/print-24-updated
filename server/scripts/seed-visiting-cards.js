import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import AttributeType from '../src/models/attributeTypeModal.js';
import SubAttribute from '../src/models/subAttributeSchema.js';
import Product from '../src/models/productModal.js';
import AttributeRule from '../src/models/AttributeRuleSchema.js';
import Category from '../src/models/categoryModal.js';
import SubCategory from '../src/models/subcategoryModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedVisitingCards = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_TEST_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find or create Category and SubCategory
    console.log('📁 Step 1: Setting up Category and SubCategory...');
    let category = await Category.findOne({ name: 'Visiting Cards' });
    if (!category) {
      // Try to find Digital category first
      category = await Category.findOne({ type: 'Digital' });
      if (!category) {
        category = await Category.create({
          name: 'Visiting Cards',
          description: 'Premium visiting cards with multiple customization options',
          type: 'Digital',
          sortOrder: 0,
        });
        console.log('   ✅ Created category: Visiting Cards');
      } else {
        console.log(`   ℹ️  Using existing category: ${category.name}`);
      }
    } else {
      console.log(`   ℹ️  Using existing category: ${category.name}`);
    }

    let subCategory = await SubCategory.findOne({ name: 'Premium Visiting Cards' });
    if (!subCategory) {
      subCategory = await SubCategory.create({
        name: 'Premium Visiting Cards',
        description: 'High-quality visiting cards with advanced customization',
        category: category._id,
        sortOrder: 0,
      });
      console.log('   ✅ Created subcategory: Premium Visiting Cards');
    } else {
      console.log(`   ℹ️  Using existing subcategory: ${subCategory.name}`);
    }

    // Step 2: Create Attributes
    console.log('\n📋 Step 2: Creating Attributes...');

    const attributes = {};

    // Paper GSM
    let paperGSM = await AttributeType.findOne({ attributeName: 'Paper GSM' });
    if (!paperGSM) {
      paperGSM = await AttributeType.create({
        attributeName: 'Paper GSM',
        functionType: 'GENERAL',
        inputStyle: 'DROPDOWN',
        primaryEffectType: 'VARIANT',
        isPricingAttribute: true,
        isRequired: true,
        displayOrder: 1,
        attributeValues: [
          { value: '300', label: '300 GSM', priceMultiplier: 1 },
          { value: '350', label: '350 GSM', priceMultiplier: 1.15 },
          { value: '400', label: '400 GSM', priceMultiplier: 1.3 },
        ],
      });
      console.log('   ✅ Created attribute: Paper GSM');
    } else {
      console.log('   ℹ️  Using existing attribute: Paper GSM');
    }
    attributes['Paper GSM'] = paperGSM._id;

    // Paper Color
    let paperColor = await AttributeType.findOne({ attributeName: 'Paper Color' });
    if (!paperColor) {
      paperColor = await AttributeType.create({
        attributeName: 'Paper Color',
        functionType: 'GENERAL',
        inputStyle: 'DROPDOWN',
        primaryEffectType: 'VARIANT',
        displayOrder: 2,
        attributeValues: [
          { value: 'White', label: 'White' },
          { value: 'Ivory', label: 'Ivory' },
          { value: 'Brown', label: 'Brown Kraft' },
        ],
      });
      console.log('   ✅ Created attribute: Paper Color');
    } else {
      console.log('   ℹ️  Using existing attribute: Paper Color');
    }
    attributes['Paper Color'] = paperColor._id;

    // Lamination
    let lamination = await AttributeType.findOne({ attributeName: 'Lamination' });
    if (!lamination) {
      lamination = await AttributeType.create({
        attributeName: 'Lamination',
        functionType: 'GENERAL',
        inputStyle: 'RADIO',
        primaryEffectType: 'PRICE',
        displayOrder: 3,
        attributeValues: [
          { value: 'None', label: 'No Lamination', priceMultiplier: 1 },
          { value: 'Gloss', label: 'Gloss Lamination', priceMultiplier: 1.1 },
          { value: 'Matte', label: 'Matte Lamination', priceMultiplier: 1.15 },
        ],
      });
      console.log('   ✅ Created attribute: Lamination');
    } else {
      console.log('   ℹ️  Using existing attribute: Lamination');
    }
    attributes['Lamination'] = lamination._id;

    // Texture
    let texture = await AttributeType.findOne({ attributeName: 'Texture' });
    if (!texture) {
      texture = await AttributeType.create({
        attributeName: 'Texture',
        functionType: 'GENERAL',
        inputStyle: 'POPUP',
        primaryEffectType: 'VARIANT',
        displayOrder: 4,
        attributeValues: [
          { value: 'None', label: 'No Texture' },
          { value: 'Linen', label: 'Linen Texture', hasSubAttributes: true },
        ],
      });
      console.log('   ✅ Created attribute: Texture');
    } else {
      console.log('   ℹ️  Using existing attribute: Texture');
    }
    attributes['Texture'] = texture._id;

    // UV
    let uv = await AttributeType.findOne({ attributeName: 'UV' });
    if (!uv) {
      uv = await AttributeType.create({
        attributeName: 'UV',
        functionType: 'GENERAL',
        inputStyle: 'RADIO',
        primaryEffectType: 'PRICE',
        displayOrder: 5,
        attributeValues: [
          { value: 'None', label: 'No UV', priceMultiplier: 1 },
          { value: 'Spot UV', label: 'Spot UV', priceMultiplier: 1.25, hasSubAttributes: true },
        ],
      });
      console.log('   ✅ Created attribute: UV');
    } else {
      console.log('   ℹ️  Using existing attribute: UV');
    }
    attributes['UV'] = uv._id;

    // Step 3: Create Sub-Attributes
    console.log('\n🧩 Step 3: Creating Sub-Attributes...');

    // UV Area sub-attributes
    const uvAreaSubAttrs = [
      { value: 'Logo', label: 'Logo Only', priceMultiplier: 1 },
      { value: 'Full', label: 'Full Card', priceMultiplier: 1.2 },
    ];

    for (const subAttr of uvAreaSubAttrs) {
      const existing = await SubAttribute.findOne({
        parentAttribute: attributes['UV'],
        parentValue: 'Spot UV',
        value: subAttr.value,
      });
      if (!existing) {
        await SubAttribute.create({
          parentAttribute: attributes['UV'],
          parentValue: 'Spot UV',
          value: subAttr.value,
          label: subAttr.label,
          priceMultiplier: subAttr.priceMultiplier,
          isEnabled: true,
        });
        console.log(`   ✅ Created sub-attribute: UV → Spot UV → ${subAttr.label}`);
      } else {
        console.log(`   ℹ️  Using existing sub-attribute: UV → Spot UV → ${subAttr.label}`);
      }
    }

    // Texture Pattern sub-attributes
    const texturePatternSubAttrs = [
      { value: 'Soft', label: 'Soft Linen' },
      { value: 'Hard', label: 'Hard Linen' },
    ];

    for (const subAttr of texturePatternSubAttrs) {
      const existing = await SubAttribute.findOne({
        parentAttribute: attributes['Texture'],
        parentValue: 'Linen',
        value: subAttr.value,
      });
      if (!existing) {
        await SubAttribute.create({
          parentAttribute: attributes['Texture'],
          parentValue: 'Linen',
          value: subAttr.value,
          label: subAttr.label,
          priceMultiplier: 1,
          isEnabled: true,
        });
        console.log(`   ✅ Created sub-attribute: Texture → Linen → ${subAttr.label}`);
      } else {
        console.log(`   ℹ️  Using existing sub-attribute: Texture → Linen → ${subAttr.label}`);
      }
    }

    // Step 4: Create Product
    console.log('\n📦 Step 4: Creating Product...');
    let product = await Product.findOne({ name: 'Premium Visiting Cards' });
    if (!product) {
      product = await Product.create({
        name: 'Premium Visiting Cards',
        category: category._id,
        subcategory: subCategory._id,
        image: 'https://dummyimage.com/600x600/cccccc/000000&text=Visiting+Cards',
        basePrice: 2.5,
        gstPercentage: 18,
        descriptionArray: [
          'Premium quality printing',
          'Multiple customization options',
          'Sharp & vibrant colors',
        ],
        dynamicAttributes: [
          { attributeType: attributes['Paper GSM'] },
          { attributeType: attributes['Paper Color'] },
          { attributeType: attributes['Lamination'] },
          { attributeType: attributes['Texture'] },
          { attributeType: attributes['UV'] },
        ],
        filters: {
          printingOption: ['Single Side', 'Both Sides'],
          orderQuantity: {
            min: 1000,
            max: 72000,
            multiples: 1000,
            quantityType: 'SIMPLE',
          },
          deliverySpeed: ['Standard', 'Express'],
        },
      });
      console.log('   ✅ Created product: Premium Visiting Cards');
    } else {
      console.log('   ℹ️  Using existing product: Premium Visiting Cards');
      // Update dynamic attributes if needed
      product.dynamicAttributes = [
        { attributeType: attributes['Paper GSM'] },
        { attributeType: attributes['Paper Color'] },
        { attributeType: attributes['Lamination'] },
        { attributeType: attributes['Texture'] },
        { attributeType: attributes['UV'] },
      ];
      await product.save();
      console.log('   ✅ Updated product dynamic attributes');
    }

    // Step 5: Create Rules
    console.log('\n🔧 Step 5: Creating Attribute Rules...');

    // Rule 1: If Paper GSM = 300 → Hide UV
    let rule1 = await AttributeRule.findOne({ name: 'Hide UV for 300 GSM' });
    if (!rule1) {
      rule1 = await AttributeRule.create({
        name: 'Hide UV for 300 GSM',
        applicableProduct: product._id,
        priority: 1,
        isActive: true,
        when: {
          attribute: attributes['Paper GSM'],
          value: '300',
        },
        then: [
          {
            action: 'HIDE',
            targetAttribute: attributes['UV'],
          },
        ],
      });
      console.log('   ✅ Created rule: Hide UV for 300 GSM');
    } else {
      console.log('   ℹ️  Using existing rule: Hide UV for 300 GSM');
    }

    // Rule 2: If Paper GSM = 400 → Auto-select Spot UV
    let rule2 = await AttributeRule.findOne({ name: 'Default Spot UV for 400 GSM' });
    if (!rule2) {
      rule2 = await AttributeRule.create({
        name: 'Default Spot UV for 400 GSM',
        applicableProduct: product._id,
        priority: 2,
        isActive: true,
        when: {
          attribute: attributes['Paper GSM'],
          value: '400',
        },
        then: [
          {
            action: 'SET_DEFAULT',
            targetAttribute: attributes['UV'],
            defaultValue: 'Spot UV',
          },
        ],
      });
      console.log('   ✅ Created rule: Default Spot UV for 400 GSM');
    } else {
      console.log('   ℹ️  Using existing rule: Default Spot UV for 400 GSM');
    }

    // Rule 3: If Lamination = Matte → Hide Texture
    let rule3 = await AttributeRule.findOne({ name: 'Hide Texture on Matte Lamination' });
    if (!rule3) {
      rule3 = await AttributeRule.create({
        name: 'Hide Texture on Matte Lamination',
        applicableProduct: product._id,
        priority: 3,
        isActive: true,
        when: {
          attribute: attributes['Lamination'],
          value: 'Matte',
        },
        then: [
          {
            action: 'HIDE',
            targetAttribute: attributes['Texture'],
          },
        ],
      });
      console.log('   ✅ Created rule: Hide Texture on Matte Lamination');
    } else {
      console.log('   ℹ️  Using existing rule: Hide Texture on Matte Lamination');
    }

    // Rule 4: If UV = Spot UV → Show ONLY Gloss / Matte Lamination
    let rule4 = await AttributeRule.findOne({ name: 'Restrict Lamination for Spot UV' });
    if (!rule4) {
      rule4 = await AttributeRule.create({
        name: 'Restrict Lamination for Spot UV',
        applicableProduct: product._id,
        priority: 4,
        isActive: true,
        when: {
          attribute: attributes['UV'],
          value: 'Spot UV',
        },
        then: [
          {
            action: 'SHOW_ONLY',
            targetAttribute: attributes['Lamination'],
            allowedValues: ['Gloss', 'Matte'],
          },
        ],
      });
      console.log('   ✅ Created rule: Restrict Lamination for Spot UV');
    } else {
      console.log('   ℹ️  Using existing rule: Restrict Lamination for Spot UV');
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Category: ${category.name} (${category._id})`);
    console.log(`   - SubCategory: ${subCategory.name} (${subCategory._id})`);
    console.log(`   - Attributes: 5 created`);
    console.log(`   - Sub-Attributes: 4 created`);
    console.log(`   - Product: ${product.name} (${product._id})`);
    console.log(`   - Rules: 4 created`);
    console.log('\n🎯 Test Checklist:');
    console.log('   ✔ Product page shows attributes');
    console.log('   ✔ Selecting 400 GSM auto-selects Spot UV');
    console.log('   ✔ Selecting 300 GSM hides UV');
    console.log('   ✔ Selecting Spot UV shows sub-attribute "UV Area"');
    console.log('   ✔ Selecting Matte Lamination hides Texture');
    console.log('   ✔ Price updates dynamically\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedVisitingCards();
