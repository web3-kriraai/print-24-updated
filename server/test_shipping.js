import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const testShipping = async () => {
    try {
        // Find a recent product id to test with
        const productId = '69991cae69781af465cdb6e6'; // Using a known ID from earlier debugging, or any valid one will do to fetch production days

        console.log('Testing Shipping Route...');

        const response = await axios.post('http://localhost:5000/api/shipping/estimate', {
            pincode: '400001', // Mumbai
            productId: productId,
            quantity: 100,
            strategy: 'balanced'
        });

        console.log('✅ Success! Shiprocket API returned:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Failed!');
        console.error(error.response?.data || error.message);
    }
};

testShipping();
