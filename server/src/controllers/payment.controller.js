/**
 * Payment Controller
 * Handles payment initialization, verification, and status checks
 * @module controllers/payment.controller
 */

import { paymentRouter } from '../services/payment/index.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import PaymentGateway from '../models/PaymentGateway.js';
import Order from '../models/orderModal.js';
import BulkOrder from '../models/BulkOrder.js'; // BulkOrder ported
import Product from '../models/productModal.js';
import Department from '../models/departmentModal.js';
import { User } from '../models/User.js';
import { triggerBulkProcessingIfNeeded } from './webhook.controller.js';

/**
 * Helper to automatically assign order to the first production department upon payment
 */
const autoApproveOrder = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate('product');
        if (!order) return;

        // If already has departmentStatuses, skip
        if (order.departmentStatuses && order.departmentStatuses.length > 0) return;

        const productId = order.product._id || order.product;
        const product = await Product.findById(productId).populate('productionSequence');

        if (!product || !product.productionSequence || product.productionSequence.length === 0) {
            console.log(`[Payment Auto-Approve] Product ${productId} has no production sequence. Skipping assignment.`);
            return;
        }

        const deptIds = product.productionSequence.map(dept => typeof dept === 'object' ? dept._id : dept);
        const departments = await Department.find({ _id: { $in: deptIds }, isEnabled: true });

        if (departments.length === 0) return;

        const deptMap = new Map(departments.map(d => [d._id.toString(), d]));
        const departmentsInOrder = deptIds
            .map(id => {
                const idStr = typeof id === 'object' ? id.toString() : id?.toString();
                return idStr ? deptMap.get(idStr) : null;
            })
            .filter(d => d !== null && d !== undefined);

        if (departmentsInOrder.length === 0) return;

        const firstDept = departmentsInOrder[0];
        const now = new Date();

        order.departmentStatuses = [{
            department: firstDept._id,
            status: 'pending',
            whenAssigned: now,
            startedAt: null,
            pausedAt: null,
            completedAt: null,
            stoppedAt: null,
            operator: null,
            notes: '',
        }];

        order.currentDepartment = firstDept._id;
        order.currentDepartmentIndex = 0;
        order.status = 'approved';

        order.productionTimeline = order.productionTimeline || [];
        order.productionTimeline.push({
            department: firstDept._id,
            action: 'requested',
            timestamp: now,
            operator: null,
            notes: `Auto-approved upon payment success and assigned to ${firstDept.name}`,
        });

        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        await order.save();
        console.log(`[Payment Auto-Approve] Order ${orderId} assigned to ${firstDept.name}`);
    } catch (err) {
        console.error('[Payment Auto-Approve] Error auto-approving order:', err);
    }
};

/**
 * Get the active payment gateway for checkout (non-admin)
 * GET /api/payment/active-gateway
 * Returns only safe public info needed to initialize a payment
 */
export const getActiveGateway = async (req, res) => {
    try {
        const gateways = await PaymentGateway.find({ is_active: true })
            .sort({ priority: 1 });

        const activeGateways = gateways
            .filter(g => g.is_active)
            .map(g => ({
                name: g.name,
                display_name: g.display_name,
                priority: g.priority,
                is_active: g.is_active,
                is_healthy: g.is_healthy !== false, // treat undefined as healthy
                supported_methods: g.supported_methods,
                min_amount: g.min_amount,
                max_amount: g.max_amount
            }));

        if (activeGateways.length === 0) {
            return res.status(503).json({ error: 'No payment gateways available' });
        }

        res.json({ gateways: activeGateways });
    } catch (error) {
        console.error('Get active gateway error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Initialize a payment for an order
 * POST /api/payment/initialize
 */
export const initializePayment = async (req, res) => {
    let order = null;
    let bulkOrder = null;
    let isBulkOrder = false;
    let orderDoc = null;

    try {
        console.log('🔵 [Payment Init] Request received:', {
            body: req.body,
            user: req.user?._id
        });

        const { orderId, preferredGateway, paymentMethod, amount, currency, customerInfo } = req.body;
        const userId = req.user?._id;

        // Try to find order or bulk order
        order = await Order.findById(orderId).populate('user');

        if (order) {
            orderDoc = order;
            // Check if it's a bulk parent order
            if (order.isBulkParent) {
                isBulkOrder = true;
                console.log('💼 Order is a bulk parent from Order collection:', order._id);
            }
        } else {
            // Check if it's a bulk order (BulkOrder model - legacy/external)
            bulkOrder = await BulkOrder.findById(orderId).populate('user');
            if (bulkOrder) {
                isBulkOrder = true;
                orderDoc = bulkOrder;
                console.log('💼 Bulk order found from BulkOrder collection:', bulkOrder._id);
            } else {
                return res.status(404).json({ error: 'Order not found' });
            }
        }

        // Verify ownership
        if (userId && orderDoc.user?._id?.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Not authorized to pay for this order' });
        }

        // Check if already paid
        if (orderDoc.paymentStatus === 'COMPLETED') {
            return res.status(400).json({ error: 'Order already paid' });
        }

        // Check for existing CREATED transaction for this order
        const isRedirectGateway = preferredGateway && ['PAYU', 'PHONEPE'].includes(preferredGateway.toUpperCase());

        let existingTransaction = null;
        if (!isRedirectGateway) {
            existingTransaction = await PaymentTransaction.findOne({
                order: orderId,
                status: 'CREATED',
                expires_at: { $gt: new Date() }
            });
        }

        if (existingTransaction) {
            const provider = await paymentRouter.getProvider(existingTransaction.gateway_name);
            return res.json({
                success: true,
                gateway: existingTransaction.gateway_name,
                transaction_id: existingTransaction._id,
                gateway_order_id: existingTransaction.gateway_order_id,
                checkout_data: {
                    key: provider?.config?.getPublicKey(),
                    order_id: existingTransaction.gateway_order_id,
                    amount: existingTransaction.amount * 100
                },
                redirect_required: false
            });
        }

        // Determine payment amount and currency
        let paymentAmount, paymentCurrency;

        if (isBulkOrder) {
            // For bulk orders, use amount from request body (sent from frontend)
            paymentAmount = amount || orderDoc.price?.totalPrice || (orderDoc.priceSnapshot?.totalPayable);
            paymentCurrency = currency || 'INR';
        } else {
            // For regular orders, use price snapshot
            paymentAmount = orderDoc.priceSnapshot.totalPayable;
            paymentCurrency = orderDoc.priceSnapshot.currency || 'INR';
        }

        // Prepare customer info
        const customer = {
            id: orderDoc.user?._id || userId,
            name: customerInfo?.name || orderDoc.user?.name || orderDoc.user?.firstName || 'Customer',
            email: customerInfo?.email || orderDoc.user?.email || 'customer@example.com',
            phone: customerInfo?.phone || orderDoc.user?.mobileNumber || orderDoc.mobileNumber || ''
        };

        console.log('💳 Initializing payment:', {
            orderId: orderDoc._id,
            isBulkOrder,
            amount: paymentAmount,
            currency: paymentCurrency,
            customer: customer.email
        });

        // Capture baseUrl for dynamic callbacks (local vs production)
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Initialize new payment
        const result = await paymentRouter.initializePayment({
            orderId: orderDoc._id,
            amount: paymentAmount,
            currency: paymentCurrency,
            preferredGateway,
            method: paymentMethod,
            customer,
            baseUrl, // Pass the baseUrl
            notes: {
                order_number: isBulkOrder ? `BULK_${orderDoc._id}` : orderDoc.orderNumber,
                order_type: isBulkOrder ? 'bulk' : 'single'
            }
        });

        res.json(result);

    } catch (error) {
        console.error('Payment initialization error:', error);
        if (isBulkOrder && orderDoc && orderDoc.constructor.modelName === 'BulkOrder') {
            await BulkOrder.findByIdAndUpdate(orderDoc._id, {
                paymentStatus: 'FAILED',
                $push: {
                    processingLogs: {
                        stage: 'PAYMENT_INIT',
                        status: 'FAILED',
                        message: error.message,
                        timestamp: new Date()
                    }
                }
            });
        } else if (orderDoc) {
            await Order.findByIdAndUpdate(orderDoc._id, {
                paymentStatus: 'FAILED'
            });
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify payment after callback
 * POST /api/payment/verify
 */
export const verifyPayment = async (req, res) => {
    try {
        // Support both snake_case and camelCase field names
        const {
            transaction_id,
            transactionId,
            gateway_order_id,
            gatewayOrderId,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            session_id,
            gateway,
            payuResponse  // PayU response object from client
        } = req.body;

        // Normalize field names
        const txnId = transaction_id || transactionId;
        const gwOrderId = gateway_order_id || gatewayOrderId;

        console.log('[Payment Verify] Received:', {
            txnId,
            gateway,
            hasPayuResponse: !!payuResponse,
            hasRazorpaySignature: !!razorpay_signature
        });

        // Find transaction
        let transaction;

        if (txnId) {
            transaction = await PaymentTransaction.findById(txnId);
        } else if (razorpay_order_id) {
            transaction = await PaymentTransaction.findOne({
                $or: [
                    { gateway_order_id: razorpay_order_id },
                    { 'metadata.razorpay_order_id': razorpay_order_id }
                ]
            });
        } else if (session_id) {
            transaction = await PaymentTransaction.findOne({ gateway_order_id: session_id });
        } else if (gwOrderId) {
            transaction = await PaymentTransaction.findOne({ gateway_order_id: gwOrderId });
        }

        if (!transaction) {
            console.error('[Payment Verify] Transaction not found:', { txnId, gwOrderId, razorpay_order_id });
            return res.status(404).json({ error: 'Transaction not found' });
        }

        console.log('[Payment Verify] Found transaction:', transaction._id, 'Gateway:', transaction.gateway_name);

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

        // Handle PayU Bolt response directly (PayU sends client-side response)
        if (gateway === 'PAYU' && payuResponse) {
            console.log('[Payment Verify] Processing PayU response:', payuResponse.txnStatus);

            const txnStatus = payuResponse.txnStatus || payuResponse.status;

            if (txnStatus === 'SUCCESS') {
                // Mark transaction as successful
                await transaction.markSuccess({
                    payment_id: payuResponse.payuMoneyId || payuResponse.mihpayid,
                    transaction_id: payuResponse.txnid || payuResponse.mihpayid,
                    method: payuResponse.mode || 'PAYU',
                    method_details: { payuResponse },
                    raw_response: payuResponse
                });

                // Update order or bulk order
                let updatedOrder = await Order.findByIdAndUpdate(transaction.order, {
                    paymentStatus: 'COMPLETED',
                    status: 'approved', // Confirmed after successful payment, change to approved for auto-production
                    'payment_details.transaction_id': transaction._id,
                    'payment_details.gateway_used': 'PAYU',
                    'payment_details.payment_method': payuResponse.mode || 'PAYU',
                    'payment_details.captured_at': new Date(),
                    'payment_details.amount_paid': transaction.amount
                });

                if (updatedOrder) {
                    await autoApproveOrder(updatedOrder._id);
                    await triggerBulkProcessingIfNeeded(updatedOrder);
                } else {
                    const updatedBulkOrder = await BulkOrder.findByIdAndUpdate(transaction.order, {
                        paymentStatus: 'COMPLETED'
                    });

                    if (updatedBulkOrder) {
                        updatedBulkOrder.addLog("PAYMENT", "SUCCESS", `Payment successful via PAYU (Bolt)`);
                        await updatedBulkOrder.save();

                        // 🔄 Cascade Payment Status to Child Orders
                        const childOrders = await Order.find({
                            $or: [
                                { bulkOrderRef: updatedBulkOrder._id },
                                { parentOrderId: updatedBulkOrder._id }
                            ]
                        });

                        let modifiedCount = 0;
                        for (const child of childOrders) {
                            child.paymentStatus = 'COMPLETED';
                            child.status = 'approved';
                            child.payment_details = {
                                transaction_id: transaction._id,
                                gateway_used: 'PAYU',
                                payment_method: payuResponse.mode || 'PAYU',
                                captured_at: new Date(),
                                amount_paid: transaction.amount
                            };
                            await child.save();
                            await autoApproveOrder(child._id);
                            modifiedCount++;
                        }
                        console.log(`[Payment Verify] Updated ${modifiedCount} child orders to COMPLETED and auto-approved (PayU)`);
                    }
                }
            } else {
                // Payment failed
                await transaction.markFailed({
                    code: payuResponse.error_code || 'PAYU_FAILED',
                    message: payuResponse.error_Message || payuResponse.txnMessage || 'Payment failed',
                    raw_response: payuResponse
                });

                return res.json({
                    success: false,
                    status: 'FAILED',
                    transaction_id: transaction._id,
                    error: payuResponse.error_Message || payuResponse.txnMessage
                });
            }

            return res.json({
                success: true,
                status: 'SUCCESS',
                transaction_id: transaction._id,
                order_id: transaction.order,
                redirectUrl: transaction.order
                    ? `/order/${transaction.order}?payment=success`
                    : `/admin/test-payment?status=success&transaction_id=${transaction._id}`
            });
        }

        // Check status with gateway (for Razorpay, Stripe, etc.)
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

            if (transaction.order) {
                let updatedOrder = await Order.findByIdAndUpdate(transaction.order, {
                    paymentStatus: 'COMPLETED',
                    status: 'approved', // Confirmed after successful payment, change to approved for auto-production
                    'payment_details.transaction_id': transaction._id,
                    'payment_details.gateway_used': transaction.gateway_name,
                    'payment_details.payment_method': status.paymentMethod,
                    'payment_details.captured_at': new Date(),
                    'payment_details.amount_paid': transaction.amount
                }, { new: true });

                if (updatedOrder) {
                    await autoApproveOrder(updatedOrder._id);
                    await triggerBulkProcessingIfNeeded(updatedOrder);
                } else {
                    // Try updating BulkOrder
                    const updatedBulkOrder = await BulkOrder.findByIdAndUpdate(transaction.order, {
                        paymentStatus: 'COMPLETED',
                        'payment_details.transaction_id': transaction._id,
                        'payment_details.gateway_used': transaction.gateway_name,
                        'payment_details.payment_method': status.paymentMethod,
                        'payment_details.captured_at': new Date(),
                        'payment_details.amount_paid': transaction.amount
                    });

                    if (updatedBulkOrder) {
                        updatedBulkOrder.addLog("PAYMENT", "SUCCESS", `Payment successful via ${transaction.gateway_name}`);
                        await updatedBulkOrder.save();

                        // 🔄 Cascade Payment Status to Child Orders
                        const childOrders = await Order.find({
                            $or: [
                                { bulkOrderRef: updatedBulkOrder._id },
                                { parentOrderId: updatedBulkOrder._id } // Corrected typo
                            ]
                        });

                        let modifiedCount = 0;
                        for (const child of childOrders) {
                            child.paymentStatus = 'COMPLETED';
                            child.status = 'approved';
                            child.payment_details = {
                                transaction_id: transaction._id,
                                gateway_used: transaction.gateway_name,
                                payment_method: status.paymentMethod,
                                captured_at: new Date(),
                                amount_paid: transaction.amount
                            };
                            await child.save();
                            await autoApproveOrder(child._id);
                            modifiedCount++;
                        }

                        console.log(`[Payment Verify] Updated ${modifiedCount} child orders to COMPLETED and auto-approved`);

                    } else {
                        console.warn(`[Payment Verify] Order/BulkOrder not found for transaction ${transaction._id}`);
                    }
                }
            } else {
                console.log(`[Payment Verify] Test payment verified (no order attached): ${transaction._id}`);
            }

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
/**
 * Initialize a test payment (Admin only - for testing payment UI)
 * POST /api/payment/test-initialize
 */
export const initializeTestPayment = async (req, res) => {
    try {
        const { amount, currency = 'INR', preferredGateway, paymentMethod } = req.body;
        const userId = req.user?._id;

        // Validate amount (expects rupees, minimum ₹1)
        if (!amount || amount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Get user info
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        // Select gateway (either preferred or by priority)
        let selectedGateway;
        if (preferredGateway) {
            selectedGateway = await paymentRouter.getProvider(preferredGateway);
            if (!selectedGateway) {
                return res.status(400).json({
                    success: false,
                    error: `Gateway ${preferredGateway} not found or not active`
                });
            }
        } else {
            // Auto-select based on priority
            selectedGateway = await paymentRouter.selectGateway({
                amount: amount, // Send rupees - provider will normalize
                currency,
                paymentMethod: paymentMethod || 'CARD',
                country: 'IN'
            });
        }

        if (!selectedGateway) {
            return res.status(503).json({
                success: false,
                error: 'No payment gateway available'
            });
        }

        // Initialize payment with provider (send rupees - provider normalizes to paise)
        const providerResult = await selectedGateway.instance.initializeTransaction({
            amount: amount, // Provider's normalizeAmount() will convert to paise
            currency,
            customer: {
                id: user._id.toString(),
                name: user.name || 'Test User',
                email: user.email,
                phone: user.phone || '9999999999'
            },
            orderId: `TEST_${Date.now()}`,
            callbackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/verify`,
            metadata: {
                test_payment: true,
                purpose: 'UI Testing'
            }
        });

        // Create transaction record for verification
        await PaymentTransaction.create({
            user: userId,
            payment_gateway: selectedGateway.config._id,
            gateway_name: selectedGateway.config.name,
            gateway_order_id: providerResult.gatewayOrderId,
            amount: amount,
            currency: currency,
            status: 'CREATED',
            metadata: {
                test_payment: true,
                purpose: 'UI Testing'
            }
        });

        return res.json({
            success: true,
            gateway: selectedGateway.name,
            checkout_url: providerResult.checkoutUrl,
            checkout_data: providerResult.checkoutData,
            gateway_order_id: providerResult.gatewayOrderId,
            redirect_required: providerResult.redirectRequired
        });

    } catch (error) {
        console.error('Test payment initialization failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to initialize test payment'
        });
    }
};
