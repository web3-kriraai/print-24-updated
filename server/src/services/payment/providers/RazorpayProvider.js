/**
 * Razorpay Payment Provider
 * @module services/payment/providers/RazorpayProvider
 */

import crypto from 'crypto';
import IPaymentProvider from '../IPaymentProvider.js';

class RazorpayProvider extends IPaymentProvider {
    constructor(config, isSandbox = false) {
        super(config, isSandbox);
        this.name = 'RAZORPAY';
        this.razorpay = null;
        this._initializeSDK();
    }

    async _initializeSDK() {
        try {
            // Dynamic import for Razorpay SDK
            const Razorpay = (await import('razorpay')).default;
            this.razorpay = new Razorpay({
                key_id: this.config.publicKey,
                key_secret: this.config.secretKey
            });
        } catch (error) {
            console.error('❌ Failed to initialize Razorpay SDK:', error.message);
            console.warn('⚠️ Razorpay provider will work in mock mode');
        }
    }

    /**
     * Normalize amount to paise (Razorpay uses smallest currency unit)
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

    async initializeTransaction(params) {
        if (!this.razorpay) {
            await this._initializeSDK();
        }

        if (!this.razorpay) {
            // Mock mode for development
            return this._mockInitialize(params);
        }

        const options = {
            amount: this.normalizeAmount(params.amount),
            currency: params.currency || 'INR',
            receipt: `receipt_${params.orderId}`,
            notes: {
                order_id: String(params.orderId),
                user_id: String(params.customer.id),
                ...params.notes
            },
            payment_capture: 1 // Auto-capture
        };

        const order = await this.razorpay.orders.create(options);

        return {
            gatewayOrderId: order.id,
            checkoutData: {
                key: this.config.publicKey,
                amount: order.amount,
                currency: order.currency,
                name: process.env.COMPANY_NAME || 'Print24',
                description: `Order #${params.orderId}`,
                order_id: order.id,
                prefill: {
                    name: params.customer.name,
                    email: params.customer.email,
                    contact: params.customer.phone
                },
                theme: {
                    color: '#3B82F6'
                },
                modal: {
                    ondismiss: function () { }
                }
            },
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        };
    }

    /**
     * Mock initialization for development without Razorpay SDK
     */
    _mockInitialize(params) {
        const mockOrderId = `order_mock_${Date.now()}`;

        return {
            gatewayOrderId: mockOrderId,
            checkoutData: {
                key: this.config.publicKey || 'rzp_test_mock',
                amount: this.normalizeAmount(params.amount),
                currency: params.currency || 'INR',
                name: 'Print24',
                description: `Order #${params.orderId}`,
                order_id: mockOrderId,
                prefill: {
                    name: params.customer.name,
                    email: params.customer.email,
                    contact: params.customer.phone
                },
                theme: { color: '#3B82F6' }
            },
            expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        };
    }

    async verifySignature(payload, signature) {
        const webhookSecret = this.config.webhookSecret;

        if (!webhookSecret) {
            console.warn('⚠️ Webhook secret not configured, skipping signature verification');
            return true;
        }

        // For Razorpay callback verification
        if (payload.razorpay_order_id && payload.razorpay_payment_id) {
            const body = payload.razorpay_order_id + '|' + payload.razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', this.config.secretKey)
                .update(body)
                .digest('hex');

            return expectedSignature === signature;
        }

        // For webhook verification
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return expectedSignature === signature;
    }

    async checkStatus(transactionId) {
        if (!this.razorpay) {
            return this._mockCheckStatus(transactionId);
        }

        try {
            // Try as payment ID first
            const payment = await this.razorpay.payments.fetch(transactionId);
            return this._normalizePaymentResponse(payment);
        } catch (error) {
            // Try as order ID
            try {
                const order = await this.razorpay.orders.fetch(transactionId);
                const payments = await this.razorpay.orders.fetchPayments(transactionId);

                if (payments.items && payments.items.length > 0) {
                    const latestPayment = payments.items[0];
                    return this._normalizePaymentResponse(latestPayment);
                }

                return {
                    status: this.normalizeStatus(order.status),
                    amount: this.denormalizeAmount(order.amount),
                    currency: order.currency,
                    gatewayTransactionId: transactionId
                };
            } catch (orderError) {
                throw new Error(`Transaction ${transactionId} not found: ${orderError.message}`);
            }
        }
    }

    _normalizePaymentResponse(payment) {
        return {
            status: this.normalizeStatus(payment.status),
            amount: this.denormalizeAmount(payment.amount),
            currency: payment.currency,
            gatewayTransactionId: payment.id,
            paymentMethod: payment.method,
            methodDetails: {
                card_last4: payment.card?.last4,
                card_network: payment.card?.network,
                bank: payment.bank,
                wallet: payment.wallet,
                vpa: payment.vpa
            },
            capturedAt: payment.captured_at ? new Date(payment.captured_at * 1000) : null
        };
    }

    _mockCheckStatus(transactionId) {
        // Mock status for development
        return {
            status: 'PENDING',
            amount: 0,
            currency: 'INR',
            gatewayTransactionId: transactionId
        };
    }

    normalizeStatus(gatewayStatus) {
        const statusMap = {
            'captured': 'SUCCESS',
            'authorized': 'PENDING',
            'created': 'PENDING',
            'attempted': 'PENDING',
            'paid': 'SUCCESS',
            'failed': 'FAILED',
            'refunded': 'REFUNDED'
        };
        return statusMap[gatewayStatus] || 'PENDING';
    }

    async processRefund(params) {
        if (!this.razorpay) {
            return this._mockRefund(params);
        }

        const refund = await this.razorpay.payments.refund(
            params.transactionId,
            {
                amount: this.normalizeAmount(params.amount),
                notes: {
                    reason: params.reason,
                    initiated_by: String(params.initiatedBy)
                }
            }
        );

        return {
            refundId: refund.id,
            status: refund.status === 'processed' ? 'COMPLETED' : 'PROCESSING',
            amount: this.denormalizeAmount(refund.amount),
            processedAt: new Date()
        };
    }

    _mockRefund(params) {
        return {
            refundId: `rfnd_mock_${Date.now()}`,
            status: 'PROCESSING',
            amount: params.amount,
            processedAt: new Date()
        };
    }

    async getRefundStatus(refundId) {
        if (!this.razorpay) {
            return { status: 'PROCESSING', refund_id: refundId };
        }

        const refund = await this.razorpay.refunds.fetch(refundId);

        return {
            refund_id: refund.id,
            status: refund.status === 'processed' ? 'COMPLETED' : 'PROCESSING',
            amount: this.denormalizeAmount(refund.amount),
            processed_at: refund.processed_at ? new Date(refund.processed_at * 1000) : null
        };
    }

    async healthCheck() {
        if (!this.razorpay) {
            return false;
        }

        try {
            // Try to fetch a non-existent payment - should return 404 but proves connectivity
            await this.razorpay.payments.fetch('pay_health_check');
            return true;
        } catch (error) {
            // 404 is expected and proves connectivity
            if (error.statusCode === 404 || error.statusCode === 400) {
                return true;
            }
            return false;
        }
    }

    getSupportedMethods() {
        return ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'QR'];
    }

    /**
     * Create a split payment using Razorpay Route
     */
    async createSplitPayment(params) {
        if (!this.razorpay) {
            throw new Error('Razorpay SDK not initialized');
        }

        const orderOptions = {
            amount: this.normalizeAmount(params.amount),
            currency: params.currency || 'INR',
            receipt: `receipt_${params.orderId}`,
            transfers: params.splits.map(split => ({
                account: split.account_id,
                amount: this.normalizeAmount(split.amount),
                currency: params.currency || 'INR',
                notes: split.notes || {}
            }))
        };

        const order = await this.razorpay.orders.create(orderOptions);

        return {
            gatewayOrderId: order.id,
            transfers: order.transfers
        };
    }
}

export default RazorpayProvider;
