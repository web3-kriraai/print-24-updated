import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SignupForm from '../models/SignupForm.js';

dotenv.config();

const checkFields = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || process.env.MONGODB_URI || process.env.MONGO_URI);
        const forms = await SignupForm.find({});
        console.log(`Found ${forms.length} forms`);
        
        forms.forEach(form => {
            console.log(`\nForm: ${form.name} (${form.code})`);
            const emailField = form.fields.find(f => f.fieldId === 'email');
            const passwordField = form.fields.find(f => f.fieldId === 'password');
            const confirmPasswordField = form.fields.find(f => f.fieldId === 'confirmPassword');
            
            console.log(`  📧 Email Field Type: ${emailField ? emailField.fieldType : 'MISSING'}`);
            console.log(`  🔒 Password Field Type: ${passwordField ? passwordField.fieldType : 'MISSING'}`);
            if (confirmPasswordField) {
                console.log(`  🔒 Confirm Password Field Type: ${confirmPasswordField.fieldType}`);
            }
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkFields();
