import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isWithinOfficeHours } from '../services/office.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const testDates = [
            { name: "Current Time", date: new Date() },
            { name: "Morning (8 AM)", date: new Date(new Date().setHours(8, 0, 0, 0)) },
            { name: "Office Hours (11 AM)", date: new Date(new Date().setHours(11, 0, 0, 0)) },
            { name: "Evening (8 PM)", date: new Date(new Date().setHours(20, 0, 0, 0)) },
            { name: "Future Date (Standard Hour)", date: new Date(new Date().setDate(new Date().getDate() + 7)) }
        ];

        console.log("\n--- Office Hours Test Results ---\n");

        for (const test of testDates) {
            const result = await isWithinOfficeHours(test.date);
            console.log(`[${test.name}] - ${test.date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
            console.log(`Result: ${result.isAllowed ? "allowed ✅" : "blocked ❌"}`);
            if (!result.isAllowed) console.log(`Reason: ${result.message}`);
            console.log("---------------------------------");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Test Error:", error);
    }
}

runTest();
