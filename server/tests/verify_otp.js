import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import axios from 'axios';

const API_URL = 'http://localhost:5000/api/otp';
const TEST_EMAIL = 'verify_test_' + Date.now() + '@example.com';

async function testOtpFlow() {
    try {
        console.log(`1. Sending OTP to ${TEST_EMAIL}...`);
        const sendRes = await axios.post(`${API_URL}/send-email`, {
            email: TEST_EMAIL,
            signupIntent: 'CUSTOMER'
        });

        console.log('   Response:', sendRes.data);

        if (!sendRes.data.success) {
            console.error('❌ Failed to send OTP');
            return;
        }

        const otp = sendRes.data.otp;
        if (!otp) {
            console.error('❌ OTP not returned in response (ensure NODE_ENV is development)');
            return;
        }

        console.log(`   ✅ OTP Received: ${otp}`);

        console.log('2. Verifying OTP...');
        const verifyRes = await axios.post(`${API_URL}/verify-email`, {
            email: TEST_EMAIL,
            otp: otp
        });

        console.log('   Response:', verifyRes.data);

        if (verifyRes.data.success) {
            console.log('   ✅ Email verification successful!');
        } else {
            console.error('   ❌ Email verification failed');
        }

    } catch (error) {
        console.error('❌ Error Message:', error.message);
        console.error('❌ Full Error:', error);
        if (error.response) {
            console.error('❌ Error Status:', error.response.status);
            console.error('❌ Error Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('❌ No response received. Request:', error.request);
        } else {
            console.error('❌ Error setting up request:', error.message);
        }
    }
}

testOtpFlow();
