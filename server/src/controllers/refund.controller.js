/**
 * Refund Controller
 * Handles refund initiation and status checks
 * @module controllers/refund.controller
 */

import Order from '../models/orderModal.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { paymentRouter } from '../services/payment/index.js';

/**
 * Initiate a refund for an order
 * POST /api/admin/orders/:orderId/refund
 */
export const initiateRefund = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { amount, reason, notes } = req.body;
        const initiatedBy = req.user._id;

        // Get order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get successful transaction for this order
        const transaction = await PaymentTransaction.findOne({
            order: orderId,
            status: { $in: ['SUCCESS', 'PARTIALLY_REFUNDED'] }
        });

        if (!transaction) {
            return res.status(400).json({
                error: 'No successful payment found for this order'
            });
        }

        // Validate amount
        const maxRefundable = transaction.amount - transaction.total_refunded;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid refund amount' });
        }

        if (amount > maxRefundable) {
            return res.status(400).json({
                error: `Cannot refund more than ₹${maxRefundable.toFixed(2)}. Already refunded: ₹${transaction.total_refunded.toFixed(2)}`
            });
        }

        // Get provider
        const provider = await paymentRouter.getProvider(transaction.gateway_name);
        if (!provider) {
            return res.status(400).json({
                error: `Payment gateway ${transaction.gateway_name} not available`
            });
        }

        // Process refund
        const transactionId = transaction.gateway_transaction_id ||
            transaction.gateway_payment_id;

        const refundResult = await provider.instance.processRefund({
            transactionId,
            amount,
            reason: reason || 'CUSTOMER_REQUEST',
            initiatedBy: String(initiatedBy)
        });

        // Update transaction with refund
        await transaction.addRefund({
            refund_id: refundResult.refundId,
            amount,
            reason: reason || 'CUSTOMER_REQUEST',
            notes,
            status: refundResult.status === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING',
            initiated_by: initiatedBy,
            gateway_response: refundResult
        });

        // Update order
        const newPaymentStatus = transaction.total_refunded >= transaction.amount
            ? 'REFUNDED'
            : 'PARTIALLY_REFUNDED';

        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: newPaymentStatus,
            'payment_details.refund_summary': {
                total_refunded: transaction.total_refunded,
                refund_count: transaction.refunds.length,
                last_refund_at: new Date()
            }
        });

        res.json({
            success: true,
            refund_id: refundResult.refundId,
            status: refundResult.status,
            amount: amount,
            total_refunded: transaction.total_refunded,
            payment_status: newPaymentStatus
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get refund status
 * GET /api/admin/refunds/:refundId
 */
export const getRefundStatus = async (req, res) => {
    try {
        const { refundId } = req.params;

        // Find transaction with this refund
        const transaction = await PaymentTransaction.findOne({
            'refunds.refund_id': refundId
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Refund not found' });
        }

        const refund = transaction.refunds.find(r => r.refund_id === refundId);

        // Check with gateway for latest status
        const provider = await paymentRouter.getProvider(transaction.gateway_name);

        if (provider && refund.status !== 'COMPLETED') {
            try {
                const gatewayStatus = await provider.instance.getRefundStatus(refundId);

                if (gatewayStatus.status === 'COMPLETED' && refund.status !== 'COMPLETED') {
                    refund.status = 'COMPLETED';
                    refund.processed_at = gatewayStatus.processed_at || new Date();
                    await transaction.save();
                }
            } catch (error) {
                console.error('Failed to check refund status with gateway:', error.message);
            }
        }

        res.json({
            refund_id: refund.refund_id,
            transaction_id: transaction._id,
            order_id: transaction.order,
            amount: refund.amount,
            status: refund.status,
            reason: refund.reason,
            notes: refund.notes,
            initiated_at: refund.initiated_at,
            processed_at: refund.processed_at
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all refunds for an order
 * GET /api/admin/orders/:orderId/refunds
 */
export const getOrderRefunds = async (req, res) => {
    try {
        const { orderId } = req.params;

        const transaction = await PaymentTransaction.findOne({
            order: orderId,
            'refunds.0': { $exists: true } // Has at least one refund
        });

        if (!transaction) {
            return res.json({ refunds: [], total_refunded: 0 });
        }

        res.json({
            transaction_id: transaction._id,
            gateway: transaction.gateway_name,
            original_amount: transaction.amount,
            total_refunded: transaction.total_refunded,
            refundable_amount: transaction.amount - transaction.total_refunded,
            refunds: transaction.refunds.map(r => ({
                refund_id: r.refund_id,
                amount: r.amount,
                status: r.status,
                reason: r.reason,
                initiated_at: r.initiated_at,
                processed_at: r.processed_at
            }))
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
