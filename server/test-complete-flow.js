/**
 * Test Complete Pricing Flow with GeoZone
 * Tests: IP → Pincode → GeoZone → Pricing
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testCompletePricingFlow() {
    console.log('🧪 Testing Complete Location-Based Pricing Flow\n');
    console.log('='.repeat(70));

    try {
        // Step 1: Get location from IP (will use fallback 395004 Surat)
        console.log('\n📍 Step 1: Get Location from IP');
        console.log('-'.repeat(70));

        const ipResponse = await fetch(`${API_BASE}/geolocation/from-ip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const ipData = await ipResponse.json();
        console.log('✅ IP Detection Response:');
        console.log(JSON.stringify(ipData, null, 2));

        if (!ipData.success || !ipData.data.pincode) {
            throw new Error(' No pincode from IP detection');
        }

        const pincode = ipData.data.pincode;
        console.log(`\n✅ Detected Pincode: ${pincode}`);

        // Step 2: Get user context (with pincode) - should resolve GeoZone
        console.log('\n📍 Step 2: Get User Context with Pincode → GeoZone');
        console.log('-'.repeat(70));

        const contextResponse = await fetch(`${API_BASE}/user/context`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pincode })
        });

        const contextData = await contextResponse.json();
        console.log('✅ User Context Response:');
        console.log(JSON.stringify(contextData, null, 2));

        if (!contextData.success) {
            throw new Error('❌ Failed to get user context');
        }

        console.log(`\n✅ Mapped to GeoZone: ${contextData.location.geoZone.name || 'NOT MAPPED'}`);
        console.log(`   Pincode: ${contextData.location.pincode}`);
        console.log(`   Segment: ${contextData.segment.name} (${contextData.segment.code})`);

        // Step 3: Get pricing quote with context
        console.log('\n📍 Step 3: Get Pricing Quote (with GeoZone + Segment)');
        console.log('-'.repeat(70));

        const pricingResponse = await fetch(`${API_BASE}/pricing/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: '6756bca47d056f16d8d5a4f4', // Example product ID
                quantity: 1000,
                pincode: pincode
            })
        });

        const pricingData = await pricingResponse.json();

        if (pricingData.success) {
            console.log('\n✅ PRICING CALCULATED SUCCESSFULLY!');
            console.log(`   Base Price: ₹${pricingData.pricing.basePrice}`);
            console.log(`   Total Payable: ₹${pricingData.pricing.totalPayable}`);
            console.log(`   User Segment: ${pricingData.meta.userSegment}`);
            console.log(`   Geo Zone: ${pricingData.meta.geoZone || 'Not mapped'}`);
            console.log(`   Pincode: ${pricingData.meta.pincode}`);

            if (pricingData.pricing.appliedModifiers?.length > 0) {
                console.log('\n🎯 Applied Modifiers:');
                pricingData.pricing.appliedModifiers.forEach((mod, i) => {
                    console.log(`   ${i + 1}. ${mod.name}: ${mod.applied > 0 ? '+' : ''}₹${mod.applied}`);
                });
            }
        } else {
            console.log('❌ Pricing calculation failed:', pricingData.error);
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ TEST COMPLETE!');
        console.log('\n📊 Summary:');
        console.log(`   • IP Detection: ${ipData.data.source}`);
        console.log(`   • Pincode: ${pincode} (${ipData.data.city}, ${ipData.data.state})`);
        console.log(`   • GeoZone: ${contextData.location.geoZone.name || 'NOT MAPPED ⚠️'}`);
        console.log(`   • Segment: ${contextData.segment.name}`);
        console.log(`   • Pricing: ${pricingData.success ? '✅ Working' : '❌ Failed'}`);

        if (contextData.location.geoZone.name) {
            console.log('\n🎉 Full flow working: IP → Pincode → GeoZone → Pricing!');
        } else {
            console.log('\n⚠️  WARNING: Pincode not mapped to GeoZone!');
            console.log(`   → Add ${pincode} to a GeoZone range in your database`);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

testCompletePricingFlow();
