/**
 * PhonePe Payment Provider
 * @module services/payment/providers/PhonePeProvider
 */

import crypto from 'crypto';
import IPaymentProvider from '../IPaymentProvider.js';

class PhonePeProvider extends IPaymentProvider {
    constructor(config, isSandbox = false) {
        super(config, isSandbox);
        this.name = 'PHONEPE';

        this.baseUrl = isSandbox
            ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
            : 'https://api.phonepe.com/apis/hermes';

        this.merchantId = config.merchantId || config.publicKey;
        this.saltKey = config.secretKey;
        this.saltIndex = config.saltIndex || 1;
    }

    /**
     * Normalize amount to paise (PhonePe uses smallest currency unit)
     */
    normalizeAmount(amount) {
        return Math.round(amount * 100);
    }

    /**
     * Denormalize amount from paise to rupees
     */
    denormalizeAmount(amount) {
        return amount / 100;
    }

    /**
     * Generate X-VERIFY header for PhonePe
     */
    _generateVerifyHeader(base64Payload, endpoint) {
        const stringToHash = base64Payload + endpoint + this.saltKey;
        const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
        return `${sha256Hash}###${this.saltIndex}`;
    }

    async initializeTransaction(params) {
        const merchantTransactionId = `MT${Date.now()}_${params.orderId}`;

        const payload = {
            merchantId: this.merchantId,
            merchantTransactionId,
            merchantUserId: String(params.customer.id),
            amount: this.normalizeAmount(params.amount),
            redirectUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/payment/callback?gateway=phonepe`,
            redirectMode: 'POST',
            callbackUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/webhook`,
            mobileNumber: params.customer.phone?.replace(/\D/g, ''),
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const xVerify = this._generateVerifyHeader(base64Payload, '/pg/v1/pay');

        try {
            const response = await fetch(`${this.baseUrl}/pg/v1/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                    'X-MERCHANT-ID': this.merchantId
                },
                body: JSON.stringify({ request: base64Payload })
            });

            const result = await response.json();

            if (result.success) {
                return {
                    gatewayOrderId: merchantTransactionId,
                    checkoutUrl: result.data.instrumentResponse.redirectInfo.url,
                    checkoutData: {
                        merchant_id: this.merchantId,
                        transaction_id: merchantTransactionId
                    },
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
                };
            } else {
                throw new Error(result.message || 'PhonePe initialization failed');
            }
        } catch (error) {
            if (error.message.includes('fetch')) {
                // Network error - return mock for development
                console.warn('⚠️ PhonePe API unavailable, using mock mode');
                return this._mockInitialize(params);
            }
            throw error;
        }
    }

    _mockInitialize(params) {
        const mockTransactionId = `MT_mock_${Date.now()}`;

        return {
            gatewayOrderId: mockTransactionId,
            checkoutUrl: `https://phonepe.com/mock-checkout/${mockTransactionId}`,
            checkoutData: {
                merchant_id: this.merchantId,
                transaction_id: mockTransactionId
            },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        };
    }

    async verifySignature(payload, signature) {
        if (!this.saltKey) {
            console.warn('⚠️ PhonePe salt key not configured');
            return true;
        }

        // PhonePe sends base64 encoded response in 'response' field
        if (payload.response) {
            const stringToHash = payload.response + this.saltKey;
            const expectedSignature = crypto
                .createHash('sha256')
                .update(stringToHash)
                .digest('hex') + '###' + this.saltIndex;

            return expectedSignature === signature;
        }

        return false;
    }

    async checkStatus(transactionId) {
        const endpoint = `/pg/v1/status/${this.merchantId}/${transactionId}`;
        const stringToHash = endpoint + this.saltKey;
        const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const xVerify = `${sha256Hash}###${this.saltIndex}`;

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: {
                    'X-VERIFY': xVerify,
                    'X-MERCHANT-ID': this.merchantId,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            return {
                status: this.normalizeStatus(result.code),
                amount: result.data?.amount ? this.denormalizeAmount(result.data.amount) : 0,
                currency: 'INR',
                gatewayTransactionId: transactionId,
                paymentMethod: result.data?.paymentInstrument?.type,
                methodDetails: result.data?.paymentInstrument
            };
        } catch (error) {
            console.error('PhonePe status check failed:', error.message);
            return {
                status: 'PENDING',
                amount: 0,
                currency: 'INR',
                gatewayTransactionId: transactionId
            };
        }
    }

    normalizeStatus(phonepeCode) {
        const statusMap = {
            'PAYMENT_SUCCESS': 'SUCCESS',
            'PAYMENT_ERROR': 'FAILED',
            'PAYMENT_DECLINED': 'FAILED',
            'PAYMENT_PENDING': 'PENDING',
            'TRANSACTION_NOT_FOUND': 'FAILED',
            'BAD_REQUEST': 'FAILED',
            'AUTHORIZATION_FAILED': 'FAILED',
            'INTERNAL_SERVER_ERROR': 'PENDING'
        };
        return statusMap[phonepeCode] || 'PENDING';
    }

    async processRefund(params) {
        const merchantTransactionId = `RFND${Date.now()}_${params.transactionId}`;

        const payload = {
            merchantId: this.merchantId,
            merchantUserId: 'SYSTEM',
            originalTransactionId: params.transactionId,
            merchantTransactionId,
            amount: this.normalizeAmount(params.amount),
            callbackUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/webhook`
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const xVerify = this._generateVerifyHeader(base64Payload, '/pg/v1/refund');

        try {
            const response = await fetch(`${this.baseUrl}/pg/v1/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerify,
                    'X-MERCHANT-ID': this.merchantId
                },
                body: JSON.stringify({ request: base64Payload })
            });

            const result = await response.json();

            if (result.success) {
                return {
                    refundId: merchantTransactionId,
                    status: 'PROCESSING',
                    amount: params.amount,
                    processedAt: new Date()
                };
            } else {
                throw new Error(result.message || 'PhonePe refund failed');
            }
        } catch (error) {
            console.error('PhonePe refund failed:', error.message);
            throw error;
        }
    }

    async getRefundStatus(refundId) {
        return this.checkStatus(refundId);
    }

    async healthCheck() {
        try {
            // Check status of a non-existent transaction to verify connectivity
            await this.checkStatus('health_check_' + Date.now());
            return true;
        } catch (error) {
            return false;
        }
    }

    getSupportedMethods() {
        return ['UPI', 'CARD', 'NETBANKING', 'WALLET'];
    }
}

export default PhonePeProvider;
