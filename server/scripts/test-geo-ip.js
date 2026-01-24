import GeolocationService from '../src/services/GeolocationService.js';

const testIPs = [
    { ip: '127.0.0.1', desc: 'Localhost (Should be Default/Mumbai)' },
    { ip: '8.8.8.8', desc: 'Google DNS (US)' },
    { ip: '110.224.0.0', desc: 'Airtel (India)' }, // Often Delhi or generic India
    { ip: '49.37.0.0', desc: 'Jio (India)' }, // Often Mumbai/Maharashtra
    { ip: '202.131.134.1', desc: 'User IP (if known) or Chennai Test' }
];

async function runTests() {
    console.log('--- Testing GeolocationService ---');
    console.log('Service loaded:', !!GeolocationService);

    for (const test of testIPs) {
        console.log(`\n-----------------------------------`);
        console.log(`Testing ${test.desc} [${test.ip}]`);
        try {
            const result = await GeolocationService.detectFromIP(test.ip);
            if (result) {
                console.log('✅ Result Found:');
                console.log(`   City: ${result.city}`);
                console.log(`   State: ${result.regionName} (${result.region})`);
                console.log(`   Country: ${result.country}`);
                console.log(`   Pincode: ${result.zipCode || 'N/A'}`);
                console.log(`   Full Data:`, JSON.stringify(result, null, 2));
            } else {
                console.log('❌ No result returned.');
            }
        } catch (error) {
            console.error('⚠️ Error:', error.message);
        }
    }
}

runTests().catch(console.error);
