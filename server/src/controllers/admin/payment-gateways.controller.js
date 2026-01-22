/**
 * Payment Gateway Admin Controller
 * CRUD operations for payment gateway management
 * @module controllers/admin/payment-gateways.controller
 */

import PaymentGateway from '../../models/PaymentGateway.js';
import PaymentTransaction from '../../models/PaymentTransaction.js';
import { paymentRouter } from '../../services/payment/index.js';
import encryptionService from '../../services/encryption.service.js';

/**
 * Get all payment gateways
 * GET /api/admin/payment-gateways
 */
export const getAllGateways = async (req, res) => {
    try {
        const gateways = await PaymentGateway.find().sort({ priority: 1 });

        // Calculate stats
        const activeCount = gateways.filter(g => g.is_active).length;

        const [totalTransactions, successfulTransactions] = await Promise.all([
            PaymentTransaction.countDocuments(),
            PaymentTransaction.countDocuments({ status: 'SUCCESS' })
        ]);

        const successRate = totalTransactions > 0
            ? Math.round((successfulTransactions / totalTransactions) * 100)
            : 0;

        const avgTDR = gateways.length > 0
            ? (gateways.reduce((sum, g) => sum + (g.tdr_rate || 2), 0) / gateways.length).toFixed(2)
            : '0.00';

        // Get masked keys for each gateway
        const gatewaysWithMaskedKeys = gateways.map(g => ({
            ...g.toObject(),
            maskedKeys: g.getMaskedKeys ? g.getMaskedKeys() : null
        }));

        res.json({
            gateways: gatewaysWithMaskedKeys,
            stats: {
                active_count: activeCount,
                total_transactions: totalTransactions,
                success_rate: successRate,
                avg_tdr: parseFloat(avgTDR)
            }
        });
    } catch (error) {
        console.error('Get gateways error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get single gateway
 * GET /api/admin/payment-gateways/:id
 */
export const getGateway = async (req, res) => {
    try {
        const gateway = await PaymentGateway.findById(req.params.id);

        if (!gateway) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        res.json({
            ...gateway.toObject(),
            maskedKeys: gateway.getMaskedKeys()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create new gateway
 * POST /api/admin/payment-gateways
 */
export const createGateway = async (req, res) => {
    try {
        const {
            name,
            display_name,
            mode,
            priority,
            traffic_split_percent,
            live_public_key,
            live_secret_key,
            test_public_key,
            test_secret_key,
            webhook_secret,
            supported_methods,
            supported_countries,
            supported_currencies,
            min_amount,
            max_amount,
            tdr_rate,
            config,
            notes
        } = req.body;

        // Check if gateway already exists
        const existing = await PaymentGateway.findOne({ name });
        if (existing) {
            return res.status(400).json({ error: `Gateway ${name} already exists` });
        }

        const gateway = new PaymentGateway({
            name,
            display_name: display_name || name,
            mode: mode || 'SANDBOX',
            priority: priority || 1,
            traffic_split_percent: traffic_split_percent || 100,
            live_public_key,
            live_secret_key,
            test_public_key,
            test_secret_key,
            webhook_secret,
            supported_methods: supported_methods || ['UPI', 'CARD', 'NETBANKING', 'WALLET'],
            supported_countries: supported_countries || ['IN'],
            supported_currencies: supported_currencies || ['INR'],
            min_amount,
            max_amount,
            tdr_rate: tdr_rate || 2.0,
            config,
            notes
        });

        await gateway.save();

        // Reload providers
        await paymentRouter.reloadProviders();

        res.status(201).json({
            success: true,
            gateway: {
                ...gateway.toObject(),
                maskedKeys: gateway.getMaskedKeys()
            }
        });
    } catch (error) {
        console.error('Create gateway error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update gateway
 * PATCH /api/admin/payment-gateways/:id
 */
export const updateGateway = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Don't update empty secret keys (keep existing)
        const secretFields = ['live_secret_key', 'test_secret_key', 'webhook_secret'];
        secretFields.forEach(field => {
            if (updates[field] === '' || updates[field] === null) {
                delete updates[field];
            }
        });

        const gateway = await PaymentGateway.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!gateway) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        // Reload providers if key fields changed
        if (updates.live_secret_key || updates.test_secret_key || updates.is_active !== undefined) {
            await paymentRouter.reloadProviders();
        }

        res.json({
            success: true,
            gateway: {
                ...gateway.toObject(),
                maskedKeys: gateway.getMaskedKeys()
            }
        });
    } catch (error) {
        console.error('Update gateway error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Toggle gateway active status
 * POST /api/admin/payment-gateways/:id/toggle
 */
export const toggleGateway = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const gateway = await PaymentGateway.findByIdAndUpdate(
            id,
            { is_active },
            { new: true }
        );

        if (!gateway) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        // Reload providers
        await paymentRouter.reloadProviders();

        res.json({
            success: true,
            is_active: gateway.is_active,
            message: `Gateway ${gateway.name} ${is_active ? 'activated' : 'deactivated'}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete gateway
 * DELETE /api/admin/payment-gateways/:id
 */
export const deleteGateway = async (req, res) => {
    try {
        const { id } = req.params;

        // Check for existing transactions
        const transactionCount = await PaymentTransaction.countDocuments({
            payment_gateway: id
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                error: `Cannot delete gateway with ${transactionCount} existing transactions. Deactivate instead.`
            });
        }

        const gateway = await PaymentGateway.findByIdAndDelete(id);

        if (!gateway) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        // Reload providers
        await paymentRouter.reloadProviders();

        res.json({ success: true, message: `Gateway ${gateway.name} deleted` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get masked credentials
 * GET /api/admin/payment-gateways/:id/credentials
 */
export const getCredentials = async (req, res) => {
    try {
        const gateway = await PaymentGateway.findById(req.params.id)
            .select('+live_public_key +test_public_key');

        if (!gateway) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        res.json({
            live_public_key: gateway.live_public_key || '',
            live_secret_key_masked: '••••••••',
            test_public_key: gateway.test_public_key || '',
            test_secret_key_masked: '••••••••',
            webhook_secret_masked: '••••••••',
            mode: gateway.mode
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Test gateway connectivity
 * POST /api/admin/payment-gateways/:id/test
 */
export const testGateway = async (req, res) => {
    try {
        const gateway = await PaymentGateway.findById(req.params.id)
            .select('+live_public_key +live_secret_key +test_public_key +test_secret_key +webhook_secret');

        if (!gateway) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        if (!gateway.is_active) {
            return res.status(400).json({ error: 'Gateway is not active' });
        }

        // Get provider
        const provider = await paymentRouter.getProvider(gateway.name);
        if (!provider) {
            return res.status(400).json({ error: 'Provider not loaded' });
        }

        // Run health check
        const startTime = Date.now();
        const isHealthy = await provider.instance.healthCheck();
        const responseTime = Date.now() - startTime;

        // Update health status
        gateway.last_health_check = new Date();
        gateway.is_healthy = isHealthy;
        if (isHealthy) {
            gateway.failure_count = 0;
        }
        await gateway.save();

        res.json({
            success: isHealthy,
            gateway: gateway.name,
            mode: gateway.mode,
            response_time_ms: responseTime,
            message: isHealthy
                ? `${gateway.name} is responding correctly`
                : `${gateway.name} health check failed`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get gateway statistics
 * GET /api/admin/payment-gateways/:id/stats
 */
export const getGatewayStats = async (req, res) => {
    try {
        const { id } = req.params;
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const [totalTransactions, successCount, failedCount, totalAmount] = await Promise.all([
            PaymentTransaction.countDocuments({
                payment_gateway: id,
                created_at: { $gte: startDate }
            }),
            PaymentTransaction.countDocuments({
                payment_gateway: id,
                status: 'SUCCESS',
                created_at: { $gte: startDate }
            }),
            PaymentTransaction.countDocuments({
                payment_gateway: id,
                status: 'FAILED',
                created_at: { $gte: startDate }
            }),
            PaymentTransaction.aggregate([
                {
                    $match: {
                        payment_gateway: id,
                        status: 'SUCCESS',
                        created_at: { $gte: startDate }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        res.json({
            period_days: parseInt(days),
            total_transactions: totalTransactions,
            successful: successCount,
            failed: failedCount,
            success_rate: totalTransactions > 0
                ? Math.round((successCount / totalTransactions) * 100)
                : 0,
            total_amount: totalAmount[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
