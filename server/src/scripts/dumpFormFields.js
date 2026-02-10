import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SignupForm from '../models/SignupForm.js';

dotenv.config();

const dumpFields = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || process.env.MONGODB_URI || process.env.MONGO_URI);
        const forms = await SignupForm.find({});
        
        forms.forEach(form => {
            console.log(`\n=== Form: ${form.name} (${form.code}) ===`);
            form.fields.forEach(f => {
                console.log(`- ID: ${f.fieldId},  Label: "${f.label}", Type: ${f.fieldType}`);
            });
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

dumpFields();
