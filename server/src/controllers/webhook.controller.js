/**
 * Webhook Controller
 * Universal webhook handler for all payment gateways
 * @module controllers/webhook.controller
 */

import PaymentWebhookLog from '../models/PaymentWebhookLog.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Order from '../models/orderModal.js';
import { paymentRouter } from '../services/payment/index.js';

/**
 * Universal webhook endpoint
 * POST /api/payment/webhook
 */
export const handleWebhook = async (req, res) => {
    const startTime = Date.now();
    let webhookLog;

    try {
        // Determine gateway from headers or payload
        const gatewayName = determineGateway(req);
        const signature = getSignature(req, gatewayName);

        // Log webhook
        webhookLog = await PaymentWebhookLog.create({
            gateway: gatewayName,
            event_type: getEventType(req.body, gatewayName),
            event_id: getEventId(req.body, gatewayName),
            payload: req.body,
            headers: sanitizeHeaders(req.headers),
            signature,
            processing_status: 'RECEIVED',
            received_at: new Date(),
            source_ip: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        // Check for duplicate
        if (webhookLog.event_id) {
            const isDuplicate = await PaymentWebhookLog.isDuplicate(gatewayName, webhookLog.event_id);
            if (isDuplicate) {
                webhookLog.processing_status = 'DUPLICATE';
                await webhookLog.save();
                return res.status(200).json({ received: true, duplicate: true });
            }
        }

        webhookLog.processing_status = 'PROCESSING';
        webhookLog.processing_attempts = 1;
        await webhookLog.save();

        // Get provider
        const provider = await paymentRouter.getProvider(gatewayName);
        if (!provider) {
            throw new Error(`Gateway ${gatewayName} not configured`);
        }

        // Verify signature
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const isValid = await provider.instance.verifySignature(
            gatewayName === 'STRIPE' ? rawBody : req.body,
            signature
        );

        webhookLog.signature_verified = isValid;

        if (!isValid) {
            webhookLog.processing_status = 'FAILED';
            webhookLog.error_message = 'Invalid signature';
            await webhookLog.save();
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Process webhook based on gateway
        const result = await processWebhook(gatewayName, req.body, provider);

        // Update log
        webhookLog.processing_status = 'PROCESSED';
        webhookLog.processed_at = new Date();
        webhookLog.processing_duration_ms = Date.now() - startTime;
        if (result.transaction) webhookLog.transaction = result.transaction;
        if (result.order) webhookLog.order = result.order;
        await webhookLog.save();

        res.status(200).json({ received: true, ...result });

    } catch (error) {
        console.error('Webhook processing error:', error);

        if (webhookLog) {
            await webhookLog.markFailed(error);
        }

        // Still return 200 to prevent retries for non-retryable errors
        res.status(200).json({
            received: true,
            error: error.message,
            will_retry: false
        });
    }
};

/**
 * Determine gateway from request
 */
function determineGateway(req) {
    // Check explicit header
    if (req.headers['x-gateway']) {
        return req.headers['x-gateway'].toUpperCase();
    }

    // Razorpay
    if (req.headers['x-razorpay-signature']) {
        return 'RAZORPAY';
    }

    // Stripe
    if (req.headers['stripe-signature']) {
        return 'STRIPE';
    }

    // PhonePe
    if (req.headers['x-verify'] || req.body?.response) {
        return 'PHONEPE';
    }

    // Heuristic from payload
    if (req.body?.event && req.body?.payload?.payment) {
        return 'RAZORPAY';
    }

    if (req.body?.type && req.body?.type.startsWith('checkout.session')) {
        return 'STRIPE';
    }

    if (req.body?.merchantId || req.body?.merchantTransactionId) {
        return 'PHONEPE';
    }

    return 'UNKNOWN';
}

/**
 * Get signature from request
 */
function getSignature(req, gateway) {
    switch (gateway) {
        case 'RAZORPAY':
            return req.headers['x-razorpay-signature'];
        case 'STRIPE':
            return req.headers['stripe-signature'];
        case 'PHONEPE':
            return req.headers['x-verify'];
        default:
            return req.headers['x-signature'] || req.body?.signature;
    }
}

/**
 * Get event type from payload
 */
function getEventType(payload, gateway) {
    switch (gateway) {
        case 'RAZORPAY':
            return payload.event || 'unknown';
        case 'STRIPE':
            return payload.type || 'unknown';
        case 'PHONEPE':
            return payload.code || 'callback';
        default:
            return payload.event || payload.type || 'unknown';
    }
}

/**
 * Get event ID for deduplication
 */
function getEventId(payload, gateway) {
    switch (gateway) {
        case 'RAZORPAY':
            return payload.payload?.payment?.entity?.id;
        case 'STRIPE':
            return payload.id;
        case 'PHONEPE':
            return payload.data?.merchantTransactionId;
        default:
            return null;
    }
}

/**
 * Sanitize headers for storage
 */
function sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
}

/**
 * Process webhook based on gateway
 */
async function processWebhook(gateway, payload, provider) {
    switch (gateway) {
        case 'RAZORPAY':
            return processRazorpayWebhook(payload, provider);
        case 'STRIPE':
            return processStripeWebhook(payload, provider);
        case 'PHONEPE':
            return processPhonePeWebhook(payload, provider);
        default:
            throw new Error(`Unsupported gateway: ${gateway}`);
    }
}

/**
 * Process Razorpay webhook
 */
async function processRazorpayWebhook(payload, provider) {
    const event = payload.event;
    const payment = payload.payload?.payment?.entity;
    const order = payload.payload?.order?.entity;

    if (event === 'payment.captured' || event === 'payment.authorized') {
        const transaction = await PaymentTransaction.findByGatewayOrder(
            order?.id || payment?.order_id,
            'RAZORPAY'
        );

        if (transaction && transaction.status !== 'SUCCESS') {
            await transaction.markSuccess({
                payment_id: payment.id,
                transaction_id: payment.id,
                method: payment.method,
                method_details: {
                    card_last4: payment.card?.last4,
                    bank: payment.bank,
                    wallet: payment.wallet,
                    vpa: payment.vpa
                }
            });

            await Order.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'COMPLETED',
                'payment_details.transaction_id': transaction._id,
                'payment_details.gateway_used': 'RAZORPAY',
                'payment_details.payment_method': payment.method,
                'payment_details.captured_at': new Date(),
                'payment_details.amount_paid': transaction.amount
            });

            return {
                processed: true,
                transaction: transaction._id,
                order: transaction.order
            };
        }
    }

    if (event === 'payment.failed') {
        const transaction = await PaymentTransaction.findByGatewayOrder(
            order?.id || payment?.order_id,
            'RAZORPAY'
        );

        if (transaction && transaction.status !== 'FAILED') {
            await transaction.markFailed({
                code: payment.error_code,
                message: payment.error_description,
                raw_response: payment
            });

            await Order.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'FAILED'
            });

            return { processed: true, transaction: transaction._id };
        }
    }

    if (event === 'refund.processed') {
        const refund = payload.payload?.refund?.entity;
        // Handle refund webhook if needed
        return { processed: true, event: 'refund' };
    }

    return { processed: false, reason: 'Unhandled event' };
}

/**
 * Process Stripe webhook
 */
async function processStripeWebhook(payload, provider) {
    const event = payload.type;
    const session = payload.data?.object;

    if (event === 'checkout.session.completed') {
        const transaction = await PaymentTransaction.findByGatewayOrder(
            session.id,
            'STRIPE'
        );

        if (transaction && transaction.status !== 'SUCCESS') {
            if (session.payment_status === 'paid') {
                await transaction.markSuccess({
                    payment_id: session.payment_intent,
                    transaction_id: session.payment_intent,
                    method: 'CARD',
                    method_details: {}
                });

                await Order.findByIdAndUpdate(transaction.order, {
                    paymentStatus: 'COMPLETED',
                    'payment_details.transaction_id': transaction._id,
                    'payment_details.gateway_used': 'STRIPE',
                    'payment_details.payment_method': 'CARD',
                    'payment_details.captured_at': new Date(),
                    'payment_details.amount_paid': transaction.amount
                });

                return { processed: true, transaction: transaction._id };
            }
        }
    }

    if (event === 'checkout.session.expired') {
        const transaction = await PaymentTransaction.findByGatewayOrder(
            session.id,
            'STRIPE'
        );

        if (transaction) {
            transaction.status = 'EXPIRED';
            await transaction.save();
            return { processed: true, transaction: transaction._id };
        }
    }

    return { processed: false, reason: 'Unhandled event' };
}

/**
 * Process PhonePe webhook
 */
async function processPhonePeWebhook(payload, provider) {
    // PhonePe sends base64 encoded response
    let decodedPayload = payload;

    if (payload.response) {
        try {
            const decoded = Buffer.from(payload.response, 'base64').toString('utf8');
            decodedPayload = JSON.parse(decoded);
        } catch (e) {
            console.error('Failed to decode PhonePe payload:', e);
        }
    }

    const code = decodedPayload.code;
    const data = decodedPayload.data;

    if (code === 'PAYMENT_SUCCESS') {
        const transaction = await PaymentTransaction.findByGatewayOrder(
            data?.merchantTransactionId,
            'PHONEPE'
        );

        if (transaction && transaction.status !== 'SUCCESS') {
            await transaction.markSuccess({
                payment_id: data.transactionId,
                transaction_id: data.transactionId,
                method: data.paymentInstrument?.type || 'UPI',
                method_details: data.paymentInstrument
            });

            await Order.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'COMPLETED',
                'payment_details.gateway_used': 'PHONEPE',
                'payment_details.payment_method': data.paymentInstrument?.type || 'UPI',
                'payment_details.captured_at': new Date(),
                'payment_details.amount_paid': transaction.amount
            });

            return { processed: true, transaction: transaction._id };
        }
    }

    if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
        const transaction = await PaymentTransaction.findByGatewayOrder(
            data?.merchantTransactionId,
            'PHONEPE'
        );

        if (transaction) {
            await transaction.markFailed({
                code,
                message: decodedPayload.message
            });

            await Order.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'FAILED'
            });

            return { processed: true, transaction: transaction._id };
        }
    }

    return { processed: false, reason: 'Unhandled event' };
}
