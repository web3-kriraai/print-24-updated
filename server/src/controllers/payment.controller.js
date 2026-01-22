/**
 * Payment Controller
 * Handles payment initialization, verification, and status checks
 * @module controllers/payment.controller
 */

import { paymentRouter } from '../services/payment/index.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Order from '../models/orderModal.js';
import { User } from '../models/User.js';

/**
 * Initialize a payment for an order
 * POST /api/payment/initialize
 */
export const initializePayment = async (req, res) => {
    try {
        const { orderId, preferredGateway, paymentMethod } = req.body;
        const userId = req.user?._id;

        // Get order
        const order = await Order.findById(orderId).populate('user');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Verify ownership
        if (userId && order.user._id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Not authorized to pay for this order' });
        }

        // Check if already paid
        if (order.paymentStatus === 'COMPLETED') {
            return res.status(400).json({ error: 'Order already paid' });
        }

        // Check for existing pending transaction
        const existingTransaction = await PaymentTransaction.findOne({
            order: orderId,
            status: 'CREATED',
            expires_at: { $gt: new Date() }
        });

        if (existingTransaction) {
            // Return existing transaction data
            const provider = await paymentRouter.getProvider(existingTransaction.gateway_name);
            return res.json({
                success: true,
                gateway: existingTransaction.gateway_name,
                transaction_id: existingTransaction._id,
                gateway_order_id: existingTransaction.gateway_order_id,
                checkout_data: {
                    key: provider?.config?.getPublicKey(),
                    order_id: existingTransaction.gateway_order_id,
                    amount: existingTransaction.amount * 100 // Convert to paise for frontend
                }
            });
        }

        // Initialize new payment
        const result = await paymentRouter.initializePayment({
            orderId: order._id,
            amount: order.priceSnapshot.totalPayable,
            currency: order.priceSnapshot.currency || 'INR',
            preferredGateway,
            method: paymentMethod,
            customer: {
                id: order.user._id,
                name: order.user.name || order.user.firstName,
                email: order.user.email,
                phone: order.user.mobileNumber || order.mobileNumber
            },
            notes: {
                order_number: order.orderNumber
            }
        });

        res.json(result);

    } catch (error) {
        console.error('Payment initialization error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify payment after callback
 * POST /api/payment/verify
 */
export const verifyPayment = async (req, res) => {
    try {
        const {
            transaction_id,
            gateway_order_id,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            session_id // For Stripe
        } = req.body;

        // Find transaction
        let transaction;

        if (transaction_id) {
            transaction = await PaymentTransaction.findById(transaction_id);
        } else if (razorpay_order_id) {
            transaction = await PaymentTransaction.findByGatewayOrder(razorpay_order_id, 'RAZORPAY');
        } else if (session_id) {
            transaction = await PaymentTransaction.findByGatewayOrder(session_id, 'STRIPE');
        } else if (gateway_order_id) {
            transaction = await PaymentTransaction.findOne({ gateway_order_id });
        }

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Get provider
        const provider = await paymentRouter.getProvider(transaction.gateway_name);
        if (!provider) {
            return res.status(400).json({ error: 'Payment gateway not available' });
        }

        // Verify signature (for Razorpay)
        if (razorpay_signature) {
            const isValid = await provider.instance.verifySignature(
                { razorpay_order_id, razorpay_payment_id },
                razorpay_signature
            );

            if (!isValid) {
                transaction.status = 'FAILED';
                transaction.error_message = 'Signature verification failed';
                await transaction.save();
                return res.status(400).json({ error: 'Invalid payment signature' });
            }
        }

        // Check status with gateway
        const transactionIdToCheck = razorpay_payment_id ||
            session_id ||
            transaction.gateway_order_id;

        const status = await provider.instance.checkStatus(transactionIdToCheck);

        if (status.status === 'SUCCESS') {
            // Update transaction
            await transaction.markSuccess({
                payment_id: razorpay_payment_id || transactionIdToCheck,
                transaction_id: status.gatewayTransactionId,
                method: status.paymentMethod,
                method_details: status.methodDetails,
                raw_response: status
            });

            // Update order
            await Order.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'COMPLETED',
                'payment_details.transaction_id': transaction._id,
                'payment_details.gateway_used': transaction.gateway_name,
                'payment_details.payment_method': status.paymentMethod,
                'payment_details.captured_at': new Date(),
                'payment_details.amount_paid': transaction.amount
            });

            res.json({
                success: true,
                status: 'SUCCESS',
                transaction_id: transaction._id,
                order_id: transaction.order
            });

        } else if (status.status === 'FAILED') {
            await transaction.markFailed({
                code: 'PAYMENT_FAILED',
                message: 'Payment was not successful',
                raw_response: status
            });

            res.json({
                success: false,
                status: 'FAILED',
                transaction_id: transaction._id
            });

        } else {
            // Still pending - set to ATTEMPTED
            transaction.status = 'ATTEMPTED';
            transaction.gateway_payment_id = razorpay_payment_id;
            await transaction.save();

            res.json({
                success: false,
                status: 'PENDING',
                message: 'Payment is being processed',
                transaction_id: transaction._id
            });
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get payment status
 * GET /api/payment/status/:transactionId
 */
export const getPaymentStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await PaymentTransaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // If not terminal status, check with gateway
        if (['CREATED', 'PENDING', 'ATTEMPTED'].includes(transaction.status)) {
            const provider = await paymentRouter.getProvider(transaction.gateway_name);

            if (provider) {
                try {
                    const status = await provider.instance.checkStatus(
                        transaction.gateway_transaction_id ||
                        transaction.gateway_payment_id ||
                        transaction.gateway_order_id
                    );

                    // Update if status changed
                    if (status.status === 'SUCCESS' && transaction.status !== 'SUCCESS') {
                        await transaction.markSuccess({
                            payment_id: status.gatewayTransactionId,
                            transaction_id: status.gatewayTransactionId,
                            method: status.paymentMethod,
                            method_details: status.methodDetails
                        });
                    } else if (status.status === 'FAILED' && transaction.status !== 'FAILED') {
                        await transaction.markFailed({
                            code: 'PAYMENT_FAILED',
                            message: 'Payment failed at gateway'
                        });
                    }
                } catch (error) {
                    console.error('Failed to check gateway status:', error.message);
                }
            }
        }

        res.json({
            transaction_id: transaction._id,
            order_id: transaction.order,
            gateway: transaction.gateway_name,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currency,
            payment_method: transaction.payment_method,
            created_at: transaction.created_at,
            captured_at: transaction.captured_at
        });

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get payment health status
 * GET /api/payment/health
 */
export const getPaymentHealth = async (req, res) => {
    try {
        const health = await paymentRouter.getHealthStatus();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            overall: 'ERROR',
            error: error.message
        });
    }
};
