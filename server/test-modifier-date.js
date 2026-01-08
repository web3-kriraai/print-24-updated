
import mongoose from 'mongoose';
import PriceModifier from './src/models/PriceModifier.js';

async function testModifierValidity() {
    // 1. Mock current date (2026-01-08 11:45 AM IST -> 06:15 AM UTC)
    const now = new Date();
    console.log('🕒 Current Server Time:', now.toISOString());
    console.log('   Local Time:', now.toString());

    // 2. Creates a modifier valid from today to today (common user selection)
    // Simulating input "2026-01-08" -> Saved as Date(2026-01-08) UTC midnight
    const validFrom = new Date("2026-01-01"); // Start of year
    const validTo = new Date("2026-01-08");   // TODAY midnight

    const modifier = new PriceModifier({
        name: "Test Discount",
        appliesTo: "GLOBAL",
        modifierType: "PERCENT_DEC",
        value: 10,
        isActive: true,
        validFrom: validFrom,
        validTo: validTo // Problem: This is 00:00:00 UTC
    });

    console.log('\n📋 Modifier Dates:');
    console.log('   Valid From:', modifier.validFrom.toISOString());
    console.log('   Valid To:  ', modifier.validTo.toISOString());

    // 3. Check validity
    const isValid = modifier.isValid();
    console.log(`\n🔍 isValid() check: ${isValid ? '✅ VALID' : '❌ EXPIRED'}`);

    if (!isValid) {
        if (modifier.validTo < now) {
            console.log('   Reason: validTo is in the past! (00:00 UTC < 06:15 UTC)');
            console.log('   💡 Fix needed: validTo should be end of day (23:59:59.999)');
        }
    }
}

testModifierValidity();
