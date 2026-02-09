// Test PayU Callback
// Run this script to simulate a POST request from PayU
// Usage: node src/scripts/test-payu-callback-manual.js


async function testCallback() {

    const url = 'http://localhost:8080/api/payment/callback/payu';
    console.log(`Testing callback URL: ${url}`);

    // Mock PayU Payload (Failure case - invalid hash/transaction)
    // We expect a Redirect (302) to Frontend
    const body = new URLSearchParams({
        txnid: 'PAYU_TEST_123',
        status: 'failure',
        amount: '100.00',
        hash: 'invalid_hash_for_test',
        mode: 'CC',
        error_Message: 'Bank failed',
        mihpayid: 'mock_payu_id'
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: body,
            redirect: 'manual' // Don't follow redirect, just show it
        });

        console.log(`Response Status: ${response.status} ${response.statusText}`);

        if (response.status >= 300 && response.status < 400) {
            console.log('✅ Success! Server attempted redirect.');
            console.log('Location Header:', response.headers.get('location'));
        } else if (response.status === 404) {
            console.error('❌ Error: 404 Not Found. Route is missing.');
        } else if (response.status === 500) {
            console.error('❌ Error: 500 Server Error. Server crashed handling request.');
        } else {
            console.log('Response:', await response.text());
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Connection Refused. Server is NOT running or not listening on port 5000.');
        } else {
            console.error('❌ Network Error:', error.message);
        }
    }
}

testCallback();
