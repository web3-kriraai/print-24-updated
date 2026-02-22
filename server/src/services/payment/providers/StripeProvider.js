/**
 * Stripe Payment Provider
 * @module services/payment/providers/StripeProvider
 */

import crypto from 'crypto';
import IPaymentProvider from '../IPaymentProvider.js';

class StripeProvider extends IPaymentProvider {
    constructor(config, isSandbox = false) {
        super(config, isSandbox);
        this.name = 'STRIPE';
        this.stripe = null;
        this._initializeSDK();
    }

    async _initializeSDK() {
        try {
            const Stripe = (await import('stripe')).default;
            this.stripe = new Stripe(this.config.secretKey, {
                apiVersion: '2023-10-16'
            });
        } catch (error) {
            console.error('❌ Failed to initialize Stripe SDK:', error.message);
            console.warn('⚠️ Stripe provider will work in mock mode');
        }
    }

    /**
     * Stripe amounts are in smallest currency unit
     * For INR, it's paise; for USD, it's cents
     */
    normalizeAmount(amount, currency = 'INR') {
        // Zero-decimal currencies don't need multiplication
        const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
        if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
            return Math.round(amount);
        }
        return Math.round(amount * 100);
    }

    denormalizeAmount(amount, currency = 'INR') {
        const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
        if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
            return amount;
        }
        return amount / 100;
    }

    async initializeTransaction(params) {
        if (!this.stripe) {
            await this._initializeSDK();
        }

        if (!this.stripe) {
            return this._mockInitialize(params);
        }

        const sessionOptions = {
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: params.customer.email,
            client_reference_id: String(params.orderId),
            line_items: [{
                price_data: {
                    currency: (params.currency || 'INR').toLowerCase(),
                    product_data: {
                        name: `Order #${params.orderId}`,
                        description: params.notes?.description || 'Print24 Order'
                    },
                    unit_amount: this.normalizeAmount(params.amount, params.currency)
                },
                quantity: 1
            }],
            success_url: `${process.env.BASE_URL || 'http://localhost:5000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL || 'http://localhost:5000'}/payment/cancel`,
            metadata: {
                order_id: String(params.orderId),
                user_id: String(params.customer.id),
                ...params.notes
            }
        };

        // Add phone if available (for receipt)
        if (params.customer.phone) {
            sessionOptions.phone_number_collection = { enabled: true };
        }

        const session = await this.stripe.checkout.sessions.create(sessionOptions);

        return {
            gatewayOrderId: session.id,
            checkoutUrl: session.url,
            checkoutData: {
                session_id: session.id,
                public_key: this.config.publicKey
            },
            expiresAt: new Date(session.expires_at * 1000)
        };
    }

    _mockInitialize(params) {
        const mockSessionId = `cs_mock_${Date.now()}`;

        return {
            gatewayOrderId: mockSessionId,
            checkoutUrl: `https://checkout.stripe.com/mock/${mockSessionId}`,
            checkoutData: {
                session_id: mockSessionId,
                public_key: this.config.publicKey || 'pk_test_mock'
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };
    }

    async verifySignature(payload, signature) {
        if (!this.stripe || !this.config.webhookSecret) {
            console.warn('⚠️ Stripe webhook secret not configured');
            return true;
        }

        try {
            // payload should be raw body string for Stripe
            const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
            this.stripe.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret);
            return true;
        } catch (error) {
            console.error('Stripe signature verification failed:', error.message);
            return false;
        }
    }

    async checkStatus(transactionId) {
        if (!this.stripe) {
            return this._mockCheckStatus(transactionId);
        }

        try {
            // Try as checkout session first
            if (transactionId.startsWith('cs_')) {
                const session = await this.stripe.checkout.sessions.retrieve(transactionId);
                return {
                    status: this.normalizeStatus(session.payment_status),
                    amount: session.amount_total ? this.denormalizeAmount(session.amount_total) : 0,
                    currency: session.currency?.toUpperCase() || 'INR',
                    gatewayTransactionId: session.payment_intent || transactionId,
                    paymentMethod: 'CARD'
                };
            }

            // Try as payment intent
            if (transactionId.startsWith('pi_')) {
                const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);
                return this._normalizePaymentIntent(paymentIntent);
            }

            // Unknown format
            throw new Error(`Unknown transaction format: ${transactionId}`);
        } catch (error) {
            console.error('Stripe status check failed:', error.message);
            throw error;
        }
    }

    _normalizePaymentIntent(pi) {
        return {
            status: this.normalizeStatus(pi.status),
            amount: this.denormalizeAmount(pi.amount),
            currency: pi.currency?.toUpperCase() || 'INR',
            gatewayTransactionId: pi.id,
            paymentMethod: 'CARD',
            methodDetails: {
                payment_method: pi.payment_method
            },
            capturedAt: pi.status === 'succeeded' ? new Date() : null
        };
    }

    _mockCheckStatus(transactionId) {
        return {
            status: 'PENDING',
            amount: 0,
            currency: 'INR',
            gatewayTransactionId: transactionId
        };
    }

    normalizeStatus(stripeStatus) {
        const statusMap = {
            'paid': 'SUCCESS',
            'succeeded': 'SUCCESS',
            'requires_payment_method': 'PENDING',
            'requires_confirmation': 'PENDING',
            'requires_action': 'PENDING',
            'processing': 'PENDING',
            'canceled': 'FAILED',
            'requires_capture': 'PENDING',
            'unpaid': 'PENDING',
            'no_payment_required': 'SUCCESS'
        };
        return statusMap[stripeStatus] || 'PENDING';
    }

    async processRefund(params) {
        if (!this.stripe) {
            return this._mockRefund(params);
        }

        // Get payment intent from session if needed
        let paymentIntentId = params.transactionId;

        if (paymentIntentId.startsWith('cs_')) {
            const session = await this.stripe.checkout.sessions.retrieve(paymentIntentId);
            paymentIntentId = session.payment_intent;
        }

        const refund = await this.stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: this.normalizeAmount(params.amount),
            reason: params.reason === 'CUSTOMER_REQUEST' ? 'requested_by_customer' : 'fraudulent',
            metadata: {
                initiated_by: String(params.initiatedBy),
                original_reason: params.reason
            }
        });

        return {
            refundId: refund.id,
            status: refund.status === 'succeeded' ? 'COMPLETED' : 'PROCESSING',
            amount: this.denormalizeAmount(refund.amount),
            processedAt: new Date(refund.created * 1000)
        };
    }

    _mockRefund(params) {
        return {
            refundId: `re_mock_${Date.now()}`,
            status: 'PROCESSING',
            amount: params.amount,
            processedAt: new Date()
        };
    }

    async getRefundStatus(refundId) {
        if (!this.stripe) {
            return { status: 'PROCESSING', refund_id: refundId };
        }

        const refund = await this.stripe.refunds.retrieve(refundId);

        return {
            refund_id: refund.id,
            status: refund.status === 'succeeded' ? 'COMPLETED' : 'PROCESSING',
            amount: this.denormalizeAmount(refund.amount),
            processed_at: new Date(refund.created * 1000)
        };
    }

    async healthCheck() {
        if (!this.stripe) {
            return false;
        }

        try {
            await this.stripe.balance.retrieve();
            return true;
        } catch (error) {
            return false;
        }
    }

    getSupportedMethods() {
        return ['CARD'];
    }

    /**
     * Create a split payment using Stripe Connect
     */
    async createSplitPayment(params) {
        if (!this.stripe) {
            throw new Error('Stripe SDK not initialized');
        }

        const sessionOptions = {
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: (params.currency || 'INR').toLowerCase(),
                    product_data: { name: `Order #${params.orderId}` },
                    unit_amount: this.normalizeAmount(params.amount)
                },
                quantity: 1
            }],
            payment_intent_data: {
                transfer_group: `ORDER_${params.orderId}`,
                // For multiple destinations
                on_behalf_of: params.splits[0]?.account_id
            },
            success_url: `${process.env.BASE_URL}/payment/success`,
            cancel_url: `${process.env.BASE_URL}/payment/cancel`
        };

        const session = await this.stripe.checkout.sessions.create(sessionOptions);

        // Schedule transfers after payment succeeds (via webhook)
        return {
            gatewayOrderId: session.id,
            checkoutUrl: session.url,
            splits: params.splits
        };
    }
}

export default StripeProvider;
