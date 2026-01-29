/**
 * PayU Money Payment Provider
 * @module services/payment/providers/PayUProvider
 */

import crypto from 'crypto';
import IPaymentProvider from '../IPaymentProvider.js';

class PayUProvider extends IPaymentProvider {
    constructor(config, isSandbox = false) {
        super(config, isSandbox);
        this.name = 'PAYU';

        // PayU URLs
        this.baseUrl = isSandbox
            ? 'https://test.payu.in/_payment'
            : 'https://secure.payu.in/_payment';

        this.verifyUrl = isSandbox
            ? 'https://test.payu.in/merchant/postservice?form=2'
            : 'https://info.payu.in/merchant/postservice?form=2';
    }

    /**
     * Normalize amount to smallest currency unit
     * PayU uses rupees directly, not paise
     */
    normalizeAmount(amount) {
        return amount;
    }

    /**
     * Denormalize amount from rupees
     */
    denormalizeAmount(amount) {
        return amount;
    }

    /**
     * Generate PayU payment hash
     * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
     */
    _generatePaymentHash(params) {
        const {
            key,
            txnid,
            amount,
            productinfo,
            firstname,
            email,
            udf1 = '',
            udf2 = '',
            udf3 = '',
            udf4 = '',
            udf5 = '',
            salt
        } = params;

        // PayU hash formula with pipe separators
        // Note: After udf5, there are 5 empty fields (represented by ||||)
        const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

        console.log('PayU Hash String:', hashString);

        const hash = crypto.createHash('sha512')
            .update(hashString)
            .digest('hex');

        console.log('PayU Hash Generated:', hash);

        return hash;
    }

    /**
     * Generate PayU response verification hash
     * Format: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
     */
    _generateResponseHash(params) {
        const {
            status,
            email,
            firstname,
            productinfo,
            amount,
            txnid,
            key
        } = params;

        const salt = this.config.secretKey;

        const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
        return crypto.createHash('sha512').update(hashString).digest('hex');
    }

    /**
     * Initialize a payment transaction
     * PayU uses redirect-based flow, not popup
     */
    async initializeTransaction(params) {
        try {
            const {
                amount,
                currency = 'INR',
                orderId,
                customer,
                notes = {}
            } = params;

            // PayU transaction ID (must be unique)
            const txnid = `PAYU_${orderId}_${Date.now()}`;

            // Build payment parameters
            const paymentParams = {
                key: this.config.publicKey,
                txnid: txnid,
                amount: amount.toString(),
                productinfo: notes.product_info || 'Order Payment',
                firstname: customer.name || customer.firstName || 'Customer',
                email: customer.email,
                phone: customer.phone || '',
                surl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/callback/payu`,
                furl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/callback/payu`,
                // Optional fields
                lastname: customer.lastName || '',
                address1: customer.address || '',
                city: customer.city || '',
                state: customer.state || '',
                country: customer.country || 'India',
                zipcode: customer.pincode || '',
                udf1: orderId.toString(),
                udf2: notes.order_number || '',
                udf3: '',
                udf4: '',
                udf5: ''
            };

            // Generate hash
            const hash = this._generatePaymentHash({
                ...paymentParams,
                salt: this.config.secretKey
            });
            paymentParams.hash = hash;

            // For mock mode
            if (this.isSandbox && !this.config.publicKey) {
                return this._mockInitialize(params);
            }

            // PayU uses redirect, so we return the URL and form data
            return {
                gatewayOrderId: txnid,
                checkoutUrl: this.baseUrl,
                checkoutData: paymentParams,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                redirectRequired: true // Flag for frontend
            };

        } catch (error) {
            console.error('PayU initialization error:', error);
            throw new Error(`PayU initialization failed: ${error.message}`);
        }
    }

    /**
     * Mock initialization for testing without credentials
     */
    _mockInitialize(params) {
        const txnid = `PAYU_MOCK_${params.orderId}_${Date.now()}`;

        return {
            gatewayOrderId: txnid,
            checkoutUrl: 'https://test.payu.in/_payment',
            checkoutData: {
                key: 'test_key',
                txnid: txnid,
                amount: params.amount,
                hash: 'mock_hash_for_testing'
            },
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            redirectRequired: true
        };
    }

    /**
     * Verify PayU callback signature
     */
    async verifySignature(payload, signature) {
        try {
            console.log('🔍 PayU verifySignature called with payload:', payload);
            console.log('🔍 Received signature:', signature);

            const {
                status,
                txnid,
                amount,
                productinfo,
                firstname,
                email,
                udf1,
                udf2,
                udf3,
                udf4,
                udf5,
                key
            } = payload;

            // Generate expected hash
            const expectedHash = this._generateResponseHash({
                status,
                txnid,
                amount,
                productinfo,
                firstname,
                email,
                udf1,
                udf2,
                udf3,
                udf4,
                udf5,
                key
            });

            console.log('✅ Expected hash:', expectedHash);
            console.log('✅ Received hash:', signature);
            console.log('✅ Hashes match:', expectedHash === signature);

            return expectedHash === signature;

        } catch (error) {
            console.error('PayU signature verification error:', error);
            return false;
        }
    }

    /**
     * Check payment status using PayU verify API
     */
    async checkStatus(transactionId) {
        try {
            // For mock mode
            if (this.isSandbox && !this.config.publicKey) {
                return this._mockCheckStatus(transactionId);
            }

            // PayU verify_payment API
            const command = 'verify_payment';
            const hashString = `${this.config.publicKey}|${command}|${transactionId}|${this.config.secretKey}`;
            const hash = crypto.createHash('sha512').update(hashString).digest('hex');

            const formData = new URLSearchParams({
                key: this.config.publicKey,
                command: command,
                var1: transactionId,
                hash: hash
            });

            const response = await fetch(this.verifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            const data = await response.json();

            if (data.status === 1 && data.transaction_details) {
                const txn = data.transaction_details[transactionId];

                return this._normalizePaymentStatus(txn);
            }

            return {
                status: 'PENDING',
                amount: 0,
                currency: 'INR'
            };

        } catch (error) {
            console.error('PayU status check error:', error);
            throw new Error(`Failed to check PayU status: ${error.message}`);
        }
    }

    /**
     * Normalize PayU transaction status to standard format
     */
    _normalizePaymentStatus(transaction) {
        const status = this.normalizeStatus(transaction.status);

        return {
            status,
            amount: parseFloat(transaction.amt) || 0,
            currency: 'INR',
            gatewayTransactionId: transaction.mihpayid,
            paymentMethod: transaction.mode,
            methodDetails: {
                bank_ref_num: transaction.bank_ref_num,
                bankcode: transaction.bankcode,
                card_num: transaction.cardnum
            },
            capturedAt: transaction.addedon ? new Date(transaction.addedon) : null
        };
    }

    /**
     * Mock status check for testing
     */
    _mockCheckStatus(transactionId) {
        return {
            status: 'SUCCESS',
            amount: 10000,
            currency: 'INR',
            gatewayTransactionId: transactionId,
            paymentMethod: 'CARD',
            capturedAt: new Date()
        };
    }

    /**
     * Generate PayU response hash for verification
     * PayU uses REVERSE hash for responses
     * Formula: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
     * NOTE: PayU includes empty additionalCharges fields (6 pipes after status)
     */
    _generateResponseHash(params) {
        const {
            status,
            txnid,
            amount,
            productinfo,
            firstname,
            email,
            udf1 = '',
            udf2 = '',
            udf3 = '',
            udf4 = '',
            udf5 = '',
            key,
            addedon = ''  // PayU sends this but we don't use it in hash
        } = params;

        console.log('🔐 Hash generation inputs:');
        console.log('  - salt:', this.config.secretKey);
        console.log('  - status:', status);
        console.log('  - txnid:', txnid);
        console.log('  - amount:', amount);
        console.log('  - productinfo:', productinfo);
        console.log('  - firstname:', firstname);
        console.log('  - email:', email);
        console.log('  - udf1:', udf1);
        console.log('  - udf2:', udf2);
        console.log('  - udf3:', udf3);
        console.log('  - udf4:', udf4);
        console.log('  - udf5:', udf5);
        console.log('  - key:', key);

        // PayU response hash (REVERSE order)
        // Format: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
        // Note: 6 empty pipes after status represent additionalCharges fields (empty in most cases)
        const hashString = `${this.config.secretKey}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;

        console.log('🔐 Complete hash string:', hashString);
        const hash = crypto.createHash('sha512').update(hashString).digest('hex');
        console.log('🔐 Generated hash:', hash);

        return hash;
    }

    /**
     * Map PayU status to normalized status
     */
    normalizeStatus(payuStatus) {
        const statusMap = {
            'success': 'SUCCESS',
            'captured': 'SUCCESS',
            'pending': 'PENDING',
            'failed': 'FAILED',
            'bounced': 'FAILED',
            'dropped': 'FAILED',
            'auth': 'PENDING',
            'timeout': 'FAILED',
            'error': 'FAILED'
        };

        return statusMap[payuStatus?.toLowerCase()] || 'PENDING';
    }

    /**
     * Process refund for a PayU transaction
     */
    async processRefund(params) {
        try {
            const { transactionId, amount, reason } = params;

            // PayU cancel_refund_transaction API
            const command = 'cancel_refund_transaction';
            const hashString = `${this.config.publicKey}|${command}|${transactionId}|${this.config.secretKey}`;
            const hash = crypto.createHash('sha512').update(hashString).digest('hex');

            const formData = new URLSearchParams({
                key: this.config.publicKey,
                command: command,
                var1: transactionId,
                var2: transactionId, // Payment ID
                var3: amount.toString(),
                hash: hash
            });

            // For mock mode
            if (this.isSandbox && !this.config.publicKey) {
                return this._mockRefund(params);
            }

            const response = await fetch(this.verifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            const data = await response.json();

            return {
                refundId: data.request_id || transactionId,
                status: data.status === 1 ? 'PENDING' : 'FAILED',
                amount: amount,
                processedAt: new Date(),
                message: data.msg || 'Refund initiated'
            };

        } catch (error) {
            console.error('PayU refund error:', error);
            throw new Error(`PayU refund failed: ${error.message}`);
        }
    }

    /**
     * Mock refund for testing
     */
    _mockRefund(params) {
        return {
            refundId: `REFUND_MOCK_${Date.now()}`,
            status: 'PENDING',
            amount: params.amount,
            processedAt: new Date(),
            message: 'Mock refund initiated'
        };
    }

    /**
     * Get refund status
     */
    async getRefundStatus(refundId) {
        // PayU doesn't have a separate refund status API
        // Refunds are tracked via check_action_status
        return {
            refundId,
            status: 'PENDING',
            message: 'Check main transaction status for refund updates'
        };
    }

    /**
     * Health check - verify API connectivity
     */
    async healthCheck() {
        try {
            // Simple connectivity check
            // PayU doesn't have a dedicated health endpoint
            // We verify configuration is valid
            if (!this.config.publicKey || !this.config.secretKey) {
                return false;
            }

            // Optionally ping the base URL
            return true;

        } catch (error) {
            console.error('PayU health check failed:', error);
            return false;
        }
    }

    /**
     * Get supported payment methods
     */
    getSupportedMethods() {
        return ['CARD', 'NETBANKING', 'UPI', 'WALLET', 'EMI'];
    }
}

export default PayUProvider;
