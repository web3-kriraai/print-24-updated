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

        console.log(`🔐 Signature verification result for ${gatewayName}:`, isValid);


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

        // For PayU callback (form redirect), redirect the user
        if (gatewayName === 'PAYU' && result.redirect) {
            console.log('🔄 Redirecting user to:', result.redirect);
            return res.redirect(result.redirect);
        }

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
    // Check URL path for explicit gateway
    if (req.path?.includes('/payu')) {
        return 'PAYU';
    }

    // Check explicit header
    if (req.headers['x-gateway']) {
        return req.headers['x-gateway'].toUpperCase();
    }

    // PayU - check for PayU-specific fields in POST body
    if (req.body?.txnid || req.body?.mihpayid || req.body?.key) {
        return 'PAYU';
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
        case 'PAYU':
            return req.body?.hash;
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
        case 'PAYU':
            return payload.status || 'callback';
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
        case 'PAYU':
            return payload.mihpayid || payload.txnid;
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
        case 'PAYU':
            return processPayUCallback(payload, provider);
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
 * Map PayU payment mode to our enum values
 */
function mapPayUPaymentMethod(payuMode) {
    const modeMap = {
        'CC': 'CARD',           // Credit Card
        'DC': 'CARD',           // Debit Card
        'NB': 'NETBANKING',     // Net Banking
        'UPI': 'UPI',           // UPI
        'CASH': 'WALLET',       // Cash Card/Wallet
        'EMI': 'EMI',           // EMI
        'WALLET': 'WALLET'      // Wallet
    };

    const mapped = modeMap[payuMode] || 'OTHER';
    console.log(`📱 Mapping PayU mode "${payuMode}" to "${mapped}"`);
    return mapped;
}

/**
 * Process PayU callback (POST form redirect)
 */
async function processPayUCallback(payload, provider) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔔 PayU Callback received');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 Full payload:', JSON.stringify(payload, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    const status = payload.status;
    const txnid = payload.txnid;
    const mihpayid = payload.mihpayid; // PayU transaction ID
    const orderId = payload.udf1; // We stored order ID in udf1
    const amount = payload.amount;

    console.log('📋 Extracted values:');
    console.log('  - status:', status);
    console.log('  - txnid:', txnid);
    console.log('  - mihpayid:', mihpayid);
    console.log('  - orderId (from udf1):', orderId);
    console.log('  - amount:', amount);

    // Find transaction by txnid (our internal transaction ID)
    const transaction = await PaymentTransaction.findByGatewayOrder(txnid, 'PAYU');

    if (!transaction) {
        console.error('❌ PayU callback: Transaction not found for txnid:', txnid);
        throw new Error('Transaction not found');
    }

    if (status === 'success') {
        // Payment successful
        console.log('✅ PayU payment successful for order:', orderId);

        if (transaction.status !== 'SUCCESS') {
            const mappedMethod = mapPayUPaymentMethod(payload.mode);

            await transaction.markSuccess({
                payment_id: mihpayid,
                transaction_id: mihpayid,
                method: mappedMethod,
                method_details: {
                    bank_ref_num: payload.bank_ref_num,
                    bankcode: payload.bankcode,
                    card_num: payload.cardnum,
                    name_on_card: payload.name_on_card,
                    PG_TYPE: payload.PG_TYPE,
                    raw_mode: payload.mode // Keep original for reference
                }
            });

            console.log('💾 Updating order in database...');
            console.log('   Order ID:', transaction.order);
            console.log('   Setting paymentStatus to: COMPLETED');

            try {
                const updatedOrder = await Order.findByIdAndUpdate(
                    transaction.order,
                    {
                        paymentStatus: 'COMPLETED',
                        'payment_details.transaction_id': transaction._id,
                        'payment_details.gateway_used': 'PAYU',
                        'payment_details.payment_method': mappedMethod,
                        'payment_details.captured_at': new Date(),
                        'payment_details.amount_paid': transaction.amount
                    },
                    { new: true } // Return updated document
                );

                if (updatedOrder) {
                    console.log('✅ Order updated successfully!');
                    console.log('   Order Number:', updatedOrder.orderNumber);
                    console.log('   Payment Status:', updatedOrder.paymentStatus);
                    console.log('   Gateway Used:', updatedOrder.payment_details?.gateway_used);
                    console.log('   Amount Paid:', updatedOrder.payment_details?.amount_paid);
                } else {
                    console.error('❌ Order not found with ID:', transaction.order);
                }
            } catch (updateError) {
                console.error('❌ Error updating order:', updateError);
                console.error('   Error details:', updateError.message);
                throw updateError;
            }
        }

        return {
            processed: true,
            transaction: transaction._id,
            order: transaction.order,
            redirect: `${process.env.FRONTEND_URL}/order/${transaction.order}?payment=success`
        };

    } else if (status === 'failure') {
        // Payment failed
        console.log('❌ PayU payment failed for order:', orderId);

        if (transaction.status !== 'FAILED') {
            await transaction.markFailed({
                code: payload.error,
                message: payload.error_Message || 'Payment failed',
                raw_response: payload
            });

            await Order.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'FAILED'
            });
        }

        return {
            processed: true,
            transaction: transaction._id,
            order: transaction.order,
            redirect: `${process.env.FRONTEND_URL}/order/${transaction.order}?payment=failed`
        };

    } else {
        // Pending or other status
        console.log('⏳ PayU payment pending/other for order:', orderId, 'Status:', status);

        return {
            processed: true,
            transaction: transaction._id,
            status: 'pending',
            redirect: `${process.env.FRONTEND_URL}/order/${transaction.order}?payment=pending`
        };
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
