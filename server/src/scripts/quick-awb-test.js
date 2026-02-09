/**
 * Quick AWB Generation Test
 * 
 * Simple script to demonstrate AWB generation without KYC
 * 
 * USAGE: node src/scripts/quick-awb-test.js
 */

import shiprocketService from '../services/courier/ShiprocketService.js';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

console.log('\n' + colors.cyan + colors.bright + '═══════════════════════════════════════════════════════════════' + colors.reset);
console.log(colors.cyan + colors.bright + '           QUICK AWB GENERATION TEST (No KYC Required)        ' + colors.reset);
console.log(colors.cyan + colors.bright + '═══════════════════════════════════════════════════════════════' + colors.reset);

// Enable mock AWB mode
shiprocketService.useMockAWB = true;

// Generate mock shipment ID
const mockShipmentId = Date.now();

console.log('\n📦 Generating AWB Code...\n');

try {
    const awbResult = await shiprocketService.generateAWB(mockShipmentId, 1);

    if (awbResult.success) {
        console.log(colors.green + '✅ AWB Generated Successfully!' + colors.reset);
        console.log('\n' + colors.cyan + '┌──────────────────────────────────────────────────────────────┐' + colors.reset);
        console.log(colors.cyan + '│                    AWB DETAILS                               │' + colors.reset);
        console.log(colors.cyan + '├──────────────────────────────────────────────────────────────┤' + colors.reset);
        console.log(colors.cyan + `│  AWB Code:          ${awbResult.awbCode.padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Courier Partner:   ${awbResult.courierName.padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Courier ID:        ${awbResult.courierId.toString().padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Is Mock:           ${(awbResult.isMock ? 'Yes (No KYC Required)' : 'No (Real AWB)').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Shipment ID:       ${mockShipmentId.toString().padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset);

        console.log('\n' + colors.yellow + '💡 This AWB can be used for testing webhook updates!' + colors.reset);
        console.log('\n' + colors.cyan + 'Test webhook with:' + colors.reset);
        console.log(`
curl -X POST http://localhost:5000/api/webhooks/courier-update \\
  -H "Content-Type: application/json" \\
  -d '{
    "awb": "${awbResult.awbCode}",
    "order_id": "TEST-ORDER-123",
    "current_status": "Delivered",
    "location": "Mumbai"
  }'
        `);

    } else {
        console.log(colors.red + '❌ AWB Generation Failed' + colors.reset);
    }
} catch (error) {
    console.error(colors.red + '❌ Error:', error.message + colors.reset);
}

console.log();
