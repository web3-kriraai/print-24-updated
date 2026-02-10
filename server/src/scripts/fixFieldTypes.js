/**
 * Migration Script: Fix Field Types in Signup Forms
 * 
 * This script updates all signup forms to use the correct field types:
 * - Changes 'text' type to 'email' for email fields
 * - Changes 'text' type to 'password' for password fields
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SignupForm from '../models/SignupForm.js';

dotenv.config();

const fixFieldTypes = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI_PRICING || process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding all signup forms...');
    const forms = await SignupForm.find({});
    console.log(`📋 Found ${forms.length} forms`);

    let updatedCount = 0;

    for (const form of forms) {
      let formUpdated = false;

      form.fields.forEach((field) => {
        // Fix email field type
        if (field.fieldId === 'email' && field.fieldType !== 'email') {
          console.log(`  📧 Fixing email field in form: ${form.name} (${field.fieldType} → email)`);
          field.fieldType = 'email';
          formUpdated = true;
        }

        // Fix password field type
        if ((field.fieldId === 'password' || field.fieldId === 'confirmPassword') && field.fieldType !== 'password') {
          console.log(`  🔒 Fixing password field in form: ${form.name} (${field.fieldType} → password)`);
          field.fieldType = 'password';
          formUpdated = true;
        }
      });

      if (formUpdated) {
        await form.save();
        updatedCount++;
        console.log(`  ✅ Updated form: ${form.name}`);
      }
    }

    console.log(`\n✨ Migration complete! Updated ${updatedCount} form(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

fixFieldTypes();
