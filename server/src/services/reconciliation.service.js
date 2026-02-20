/**
 * Payment Reconciliation Service
 * Background job to reconcile pending payments with gateways
 * @module services/reconciliation.service
 */

import PaymentTransaction from '../models/PaymentTransaction.js';
import PaymentReconciliationJob from '../models/PaymentReconciliationJob.js';
import Order from '../models/orderModal.js';
// import BulkOrder from '../models/BulkOrder.js'; // BulkOrder not migrated yet
import { paymentRouter } from './payment/index.js';

class ReconciliationService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    /**
     * Run reconciliation for pending transactions
     * @param {string} type - SCHEDULED, MANUAL, or RETRY
     * @param {string} [initiatedBy] - User ID for manual runs
     */
    async runReconciliation(type = 'SCHEDULED', initiatedBy = null) {
        if (this.isRunning) {
            console.log('⚠️ Reconciliation already running, skipping...');
            return { skipped: true, reason: 'Already running' };
        }

        this.isRunning = true;
        const jobId = PaymentReconciliationJob.generateJobId(type);

        try {
            console.log(`🔄 Starting reconciliation job ${jobId}...`);

            // Create job record
            const job = await PaymentReconciliationJob.create({
                job_id: jobId,
                type,
                status: 'QUEUED',
                date_range: {
                    start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
                    end: new Date()
                },
                initiated_by: initiatedBy
            });

            await job.start();

            // Find pending transactions older than 10 minutes
            const pendingTransactions = await PaymentTransaction.findPendingForReconciliation(10);

            console.log(`📊 Found ${pendingTransactions.length} transactions to reconcile`);

            job.stats.total_transactions = pendingTransactions.length;
            await job.save();

            let amountExpected = 0;
            let amountReceived = 0;

            for (const transaction of pendingTransactions) {
                try {
                    amountExpected += transaction.amount;

                    // Get provider
                    const provider = await paymentRouter.getProvider(transaction.gateway_name);

                    if (!provider) {
                        await job.addError({
                            transaction_id: transaction._id,
                            gateway: transaction.gateway_name,
                            error: 'Provider not available'
                        });
                        continue;
                    }

                    // Check status with gateway
                    const transactionId = transaction.gateway_transaction_id ||
                        transaction.gateway_payment_id ||
                        transaction.gateway_order_id;

                    const status = await provider.instance.checkStatus(transactionId);

                    switch (status.status) {
                        case 'SUCCESS':
                            await this._handleSuccessfulPayment(transaction, status, job);
                            amountReceived += transaction.amount;
                            job.stats.matched++;
                            console.log(`✅ Transaction ${transaction._id} reconciled as SUCCESS`);
                            break;

                        case 'FAILED':
                            await this._handleFailedPayment(transaction, status, job);
                            job.stats.matched++;
                            console.log(`❌ Transaction ${transaction._id} reconciled as FAILED`);
                            break;

                        default:
                            // Still pending
                            job.stats.pending++;
                            break;
                    }

                    job.stats.processed++;
                    await job.save();

                } catch (error) {
                    console.error(`Failed to reconcile transaction ${transaction._id}:`, error.message);

                    await job.addError({
                        transaction_id: transaction._id,
                        gateway: transaction.gateway_name,
                        error: error.message
                    });

                    // Mark as mismatch for manual review
                    transaction.reconciliation_status = 'MISMATCH';
                    transaction.reconciliation_notes = `Error: ${error.message}`;
                    await transaction.save();
                }
            }

            // Complete job
            await job.complete({
                amount_summary: {
                    total_expected: amountExpected,
                    total_received: amountReceived,
                    total_refunded: 0
                }
            });

            console.log(`✅ Reconciliation job ${jobId} completed. Stats:`, job.stats);

            return {
                success: true,
                job_id: jobId,
                stats: job.stats
            };

        } catch (error) {
            console.error('❌ Reconciliation job failed:', error);

            await PaymentReconciliationJob.findOneAndUpdate(
                { job_id: jobId },
                {
                    status: 'FAILED',
                    notes: error.message,
                    completed_at: new Date()
                }
            );

            return {
                success: false,
                job_id: jobId,
                error: error.message
            };

        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Map gateway-specific payment methods to our standard enum
     */
    _mapPaymentMethod(gatewayName, rawMethod) {
        if (!rawMethod) return null;

        // Normalize to uppercase
        const method = rawMethod.toUpperCase();

        // PayU-specific mappings
        if (gatewayName === 'PAYU') {
            const payuMap = {
                'CC': 'CARD',
                'DC': 'CARD',
                'NB': 'NETBANKING',
                'CASH': 'WALLET',
                'UPI': 'UPI',
                'EMI': 'EMI'
            };
            return payuMap[method] || method;
        }

        // Razorpay/Stripe already use standard values
        return method;
    }

    /**
     * Handle successful payment discovered during reconciliation
     */
    async _handleSuccessfulPayment(transaction, gatewayStatus, job) {
        // Map payment method to standard enum
        const mappedMethod = this._mapPaymentMethod(transaction.gateway_name, gatewayStatus.paymentMethod);

        // Update transaction
        transaction.status = 'SUCCESS';
        transaction.reconciliation_status = 'MATCHED';
        transaction.reconciled_at = new Date();
        transaction.captured_at = gatewayStatus.capturedAt || new Date();
        transaction.payment_method = mappedMethod;
        transaction.payment_method_details = gatewayStatus.methodDetails;
        transaction.gateway_transaction_id = gatewayStatus.gatewayTransactionId;
        transaction.reconciliation_notes = 'Auto-reconciled: Payment captured';
        await transaction.save();

        // Update order or bulk order
        let updatedOrder = await Order.findByIdAndUpdate(transaction.order, {
            paymentStatus: 'COMPLETED',
            'payment_details.transaction_id': transaction._id,
            'payment_details.gateway_used': transaction.gateway_name,
            'payment_details.payment_method': mappedMethod,
            'payment_details.captured_at': transaction.captured_at,
            'payment_details.amount_paid': transaction.amount
        });

        if (!updatedOrder) {
            // Try updating as a bulk order
            /*
            const updatedBulkOrder = await BulkOrder.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'COMPLETED'
            });

            if (updatedBulkOrder) {
                updatedBulkOrder.addLog("RECONCILIATION", "SUCCESS", `Payment reconciled via ${transaction.gateway_name}`);
                await updatedBulkOrder.save();

                // 🔄 Cascade Payment Status to Child Orders
                await Order.updateMany(
                    {
                        $or: [
                            { bulkOrderRef: updatedBulkOrder._id },
                            { bulkParentOrderId: updatedBulkOrder._id }
                        ]
                    },
                    {
                        $set: {
                            paymentStatus: 'COMPLETED',
                            'payment_details.transaction_id': transaction._id,
                            'payment_details.gateway_used': transaction.gateway_name,
                            'payment_details.payment_method': mappedMethod,
                            'payment_details.captured_at': transaction.captured_at,
                            'payment_details.amount_paid': transaction.amount
                        }
                    }
                );
            }
            */
        }

        job.stats.auto_resolved++;
    }

    /**
     * Handle failed payment discovered during reconciliation
     */
    async _handleFailedPayment(transaction, gatewayStatus, job) {
        transaction.status = 'FAILED';
        transaction.reconciliation_status = 'MATCHED';
        transaction.reconciled_at = new Date();
        transaction.reconciliation_notes = 'Auto-reconciled: Payment failed';
        await transaction.save();

        let updatedOrder = await Order.findByIdAndUpdate(transaction.order, {
            paymentStatus: 'FAILED'
        });

        if (!updatedOrder) {
            /*
            await BulkOrder.findByIdAndUpdate(transaction.order, {
                paymentStatus: 'FAILED'
            });
            */
        }
    }

    /**
     * Schedule reconciliation cron job
     * @param {string} cronExpression - Cron expression (default: every 15 mins)
     */
    schedule(cronExpression = '*/15 * * * *') {
        if (process.env.ENABLE_RECONCILIATION_CRON !== 'true') {
            console.log('ℹ️ Reconciliation cron disabled (set ENABLE_RECONCILIATION_CRON=true to enable)');
            return;
        }

        // Use dynamic import for node-cron (optional dependency)
        import('node-cron').then(cron => {
            this.cronJob = cron.schedule(cronExpression, () => {
                console.log('⏰ Running scheduled reconciliation...');
                this.runReconciliation('SCHEDULED').catch(console.error);
            });

            console.log(`⏰ Reconciliation service scheduled: ${cronExpression}`);
        }).catch(error => {
            console.warn('⚠️ node-cron not installed. Reconciliation will not run automatically.');
            console.warn('   Install with: npm install node-cron');
        });
    }

    /**
     * Stop the cron job
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('⏹️ Reconciliation service stopped');
        }
    }

    /**
     * Manual trigger for admin
     * @param {Object} options - Reconciliation options
     */
    async triggerManual(options = {}) {
        const { hoursBack = 24, initiatedBy } = options;

        console.log(`🔧 Manual reconciliation triggered for last ${hoursBack} hours`);
        return this.runReconciliation('MANUAL', initiatedBy);
    }

    /**
     * Get reconciliation status and history
     */
    async getStatus() {
        const latestJob = await PaymentReconciliationJob.getLatest();
        const pendingCount = await PaymentTransaction.countDocuments({
            status: { $in: ['CREATED', 'PENDING', 'ATTEMPTED'] },
            reconciliation_status: 'PENDING'
        });

        return {
            is_running: this.isRunning,
            pending_transactions: pendingCount,
            latest_job: latestJob ? {
                job_id: latestJob.job_id,
                status: latestJob.status,
                started_at: latestJob.started_at,
                completed_at: latestJob.completed_at,
                stats: latestJob.stats
            } : null
        };
    }
}

// Export singleton
const reconciliationService = new ReconciliationService();
export default reconciliationService;
