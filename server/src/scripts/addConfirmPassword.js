/**
 * Script to add Confirm Password field to all signup forms
 * This ensures users must confirm their password during signup
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SignupForm from '../models/SignupForm.js';

dotenv.config();

const addConfirmPasswordField = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI_PRICING || process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding all signup forms...');
    const forms = await SignupForm.find({});
    console.log(`📋 Found ${forms.length} forms`);

    let updatedCount = 0;

    for (const form of forms) {
      // Check if confirmPassword field already exists
      const hasConfirmPassword = form.fields.some(f => f.fieldId === 'confirmPassword');
      
      if (hasConfirmPassword) {
        console.log(`  ⏭️  Skipping ${form.name} - already has confirmPassword field`);
        continue;
      }

      // Find the password field to insert after it
      const passwordFieldIndex = form.fields.findIndex(f => f.fieldId === 'password');
      
      if (passwordFieldIndex === -1) {
        console.log(`  ⚠️  Skipping ${form.name} - no password field found`);
        continue;
      }

      // Get the highest order value
      const maxOrder = Math.max(...form.fields.map(f => f.order || 0));

      // Create confirmPassword field
      const confirmPasswordField = {
        fieldId: 'confirmPassword',
        label: 'Confirm Password',
        fieldType: 'password',
        placeholder: 'Re-enter your password',
        helpText: 'Please re-enter your password for confirmation',
        validation: {
          required: true,
          minLength: 8,
          customErrorMessage: 'Passwords must match'
        },
        order: (form.fields[passwordFieldIndex].order || 0) + 1,
        isSystemField: true
      };

      // Insert confirmPassword field right after password
      form.fields.splice(passwordFieldIndex + 1, 0, confirmPasswordField);

      // Reorder subsequent fields
      for (let i = passwordFieldIndex + 2; i < form.fields.length; i++) {
        form.fields[i].order = (form.fields[i].order || 0) + 1;
      }

      await form.save();
      updatedCount++;
      console.log(`  ✅ Added confirmPassword to: ${form.name}`);
    }

    console.log(`\n✨ Migration complete! Updated ${updatedCount} form(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addConfirmPasswordField();
