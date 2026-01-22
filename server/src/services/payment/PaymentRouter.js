/**
 * Payment Router - The Orchestrator
 * Selects and manages payment gateway providers
 * @module services/payment/PaymentRouter
 */

import PaymentGateway from '../../models/PaymentGateway.js';
import PaymentTransaction from '../../models/PaymentTransaction.js';

class PaymentRouter {
    constructor() {
        this.providers = new Map();
        this.loaded = false;
        this.routingStrategy = 'PRIORITY'; // PRIORITY, TRAFFIC_SPLIT, INTELLIGENT
        this.providerClasses = new Map();
    }

    /**
     * Register a provider class for a gateway
     * @param {string} name - Gateway name (RAZORPAY, STRIPE, etc.)
     * @param {Function} ProviderClass - Provider class constructor
     */
    registerProvider(name, ProviderClass) {
        this.providerClasses.set(name, ProviderClass);
    }

    /**
     * Load all active payment gateways from database
     * @param {boolean} force - Force reload even if already loaded
     */
    async loadProviders(force = false) {
        if (this.loaded && !force) return;

        try {
            const activeGateways = await PaymentGateway.getActiveGateways();

            // Clear existing providers on reload
            this.providers.clear();

            for (const gateway of activeGateways) {
                const ProviderClass = this.providerClasses.get(gateway.name);

                if (!ProviderClass) {
                    console.warn(`⚠️ No provider class registered for ${gateway.name}`);
                    continue;
                }

                try {
                    const providerConfig = gateway.getProviderConfig();
                    const provider = new ProviderClass(providerConfig, gateway.mode === 'SANDBOX');

                    if (!provider.validateConfig()) {
                        console.warn(`⚠️ Invalid configuration for ${gateway.name}`);
                        continue;
                    }

                    this.providers.set(gateway.name, {
                        instance: provider,
                        config: gateway,
                        stats: {
                            total_requests: 0,
                            successful: 0,
                            failed: 0,
                            last_used: null,
                            avg_response_time: 0
                        }
                    });

                    console.log(`✅ Loaded payment provider: ${gateway.name} (${gateway.mode})`);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${gateway.name}:`, error.message);
                }
            }

            this.loaded = true;
            console.log(`📦 Payment Router: ${this.providers.size} providers loaded`);
        } catch (error) {
            console.error('❌ Failed to load payment providers:', error);
            throw error;
        }
    }

    /**
     * Reload providers (useful after admin updates gateway config)
     */
    async reloadProviders() {
        this.loaded = false;
        await this.loadProviders(true);
    }

    /**
     * Select gateway based on routing strategy
     * @param {Object} params - Selection parameters
     * @returns {Object} Selected provider with instance and config
     */
    async selectGateway(params = {}) {
        await this.loadProviders();

        const {
            amount = 0,
            currency = 'INR',
            country = 'IN',
            paymentMethod,
            preferredGateway,
            excludeGateways = []
        } = params;

        // Filter eligible providers
        const eligibleProviders = Array.from(this.providers.values())
            .filter(provider => {
                const config = provider.config;

                // Exclude specific gateways
                if (excludeGateways.includes(config.name)) return false;

                // Check if provider is healthy
                if (!config.is_healthy) return false;

                // Check if active
                if (!config.is_active) return false;

                // Check country support
                if (config.supported_countries?.length &&
                    !config.supported_countries.includes(country)) {
                    return false;
                }

                // Check currency support
                if (config.supported_currencies?.length &&
                    !config.supported_currencies.includes(currency)) {
                    return false;
                }

                // Check amount limits
                if (config.min_amount && amount < config.min_amount) return false;
                if (config.max_amount && amount > config.max_amount) return false;

                // Check payment method support
                if (paymentMethod && config.supported_methods?.length) {
                    if (!config.supported_methods.includes(paymentMethod)) return false;
                }

                return true;
            });

        if (eligibleProviders.length === 0) {
            throw new Error('No eligible payment gateways available');
        }

        // If preferred gateway is specified and eligible, use it
        if (preferredGateway) {
            const preferred = eligibleProviders.find(p => p.config.name === preferredGateway);
            if (preferred) return preferred;
        }

        // Apply routing strategy
        switch (this.routingStrategy) {
            case 'PRIORITY':
                return this._selectByPriority(eligibleProviders);

            case 'TRAFFIC_SPLIT':
                return this._selectByTrafficSplit(eligibleProviders);

            case 'INTELLIGENT':
                return this._selectIntelligently(eligibleProviders, params);

            default:
                return this._selectByPriority(eligibleProviders);
        }
    }

    /**
     * Select by priority (lowest priority number = highest priority)
     */
    _selectByPriority(providers) {
        const sorted = providers.sort((a, b) => a.config.priority - b.config.priority);
        return sorted[0];
    }

    /**
     * Select by traffic split percentage
     */
    _selectByTrafficSplit(providers) {
        const totalSplit = providers.reduce(
            (sum, p) => sum + (p.config.traffic_split_percent || 100),
            0
        );

        const random = Math.random() * totalSplit;
        let cumulative = 0;

        for (const provider of providers) {
            cumulative += provider.config.traffic_split_percent || 100;
            if (random <= cumulative) {
                return provider;
            }
        }

        return providers[0];
    }

    /**
     * Intelligent selection based on multiple factors
     */
    _selectIntelligently(providers, params) {
        const scoredProviders = providers.map(provider => {
            let score = 100;

            // Priority bonus (lower priority = higher score)
            score += (10 - provider.config.priority) * 5;

            // Success rate bonus
            const totalRequests = provider.stats.total_requests || 1;
            const successRate = (provider.stats.successful || 0) / totalRequests;
            score += successRate * 50;

            // Penalize recent failures
            score -= (provider.config.failure_count || 0) * 10;

            // TDR consideration (lower TDR = higher score)
            score -= (provider.config.tdr_rate || 2) * 2;

            // Recency bonus (prefer less recently used for distribution)
            if (provider.stats.last_used) {
                const hoursSinceUse = (Date.now() - provider.stats.last_used.getTime()) / (1000 * 60 * 60);
                score += Math.min(hoursSinceUse * 2, 20);
            }

            return { provider, score };
        });

        scoredProviders.sort((a, b) => b.score - a.score);
        return scoredProviders[0].provider;
    }

    /**
     * Initialize a payment with automatic gateway selection
     * @param {Object} paymentRequest - Payment request details
     * @returns {Promise<Object>} Checkout data
     */
    async initializePayment(paymentRequest) {
        const selected = await this.selectGateway({
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            country: paymentRequest.country,
            paymentMethod: paymentRequest.method,
            preferredGateway: paymentRequest.preferredGateway
        });

        const startTime = Date.now();

        // Update stats
        selected.stats.total_requests++;
        selected.stats.last_used = new Date();

        try {
            const result = await selected.instance.initializeTransaction({
                amount: paymentRequest.amount,
                currency: paymentRequest.currency || 'INR',
                orderId: paymentRequest.orderId,
                customer: paymentRequest.customer,
                notes: paymentRequest.notes
            });

            selected.stats.successful++;
            selected.stats.avg_response_time =
                (selected.stats.avg_response_time + (Date.now() - startTime)) / 2;

            // Create transaction record
            const transaction = await PaymentTransaction.create({
                order: paymentRequest.orderId,
                user: paymentRequest.customer.id,
                payment_gateway: selected.config._id,
                gateway_name: selected.config.name,
                gateway_order_id: result.gatewayOrderId,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency || 'INR',
                status: 'CREATED',
                expires_at: result.expiresAt,
                metadata: paymentRequest.metadata
            });

            return {
                success: true,
                gateway: selected.config.name,
                transaction_id: transaction._id,
                gateway_order_id: result.gatewayOrderId,
                checkout_data: result.checkoutData,
                checkout_url: result.checkoutUrl,
                expires_at: result.expiresAt
            };

        } catch (error) {
            selected.stats.failed++;

            // Mark gateway as unhealthy if too many failures
            if (selected.stats.failed > 5 &&
                selected.stats.failed / selected.stats.total_requests > 0.3) {
                await this._markGatewayUnhealthy(selected.config.name);
            }

            throw error;
        }
    }

    /**
     * Retry payment with a fallback gateway
     * @param {Object} originalTransaction - Original failed transaction
     * @param {Object} retryParams - Retry parameters
     */
    async retryWithFallback(originalTransaction, retryParams) {
        const originalGateway = originalTransaction.gateway_name;

        // Find alternative gateway
        const selected = await this.selectGateway({
            ...retryParams,
            excludeGateways: [originalGateway]
        });

        console.log(`🔄 Retrying payment with fallback: ${originalGateway} -> ${selected.config.name}`);

        return this.initializePayment({
            ...retryParams,
            preferredGateway: selected.config.name,
            metadata: {
                ...retryParams.metadata,
                is_fallback: true,
                original_gateway: originalGateway,
                original_transaction: originalTransaction._id
            }
        });
    }

    /**
     * Get provider by name
     * @param {string} name - Gateway name
     * @returns {Object|null} Provider object or null
     */
    async getProvider(name) {
        await this.loadProviders();
        return this.providers.get(name) || null;
    }

    /**
     * Check status of a transaction with its gateway
     * @param {string} gatewayName - Gateway name
     * @param {string} transactionId - Gateway's transaction ID
     */
    async checkTransactionStatus(gatewayName, transactionId) {
        const provider = await this.getProvider(gatewayName);
        if (!provider) {
            throw new Error(`Gateway ${gatewayName} not available`);
        }

        return provider.instance.checkStatus(transactionId);
    }

    /**
     * Process refund through the original gateway
     * @param {Object} refundParams - Refund parameters
     */
    async processRefund(refundParams) {
        const { gatewayName, transactionId, amount, reason, initiatedBy } = refundParams;

        const provider = await this.getProvider(gatewayName);
        if (!provider) {
            throw new Error(`Gateway ${gatewayName} not available for refund`);
        }

        return provider.instance.processRefund({
            transactionId,
            amount,
            reason,
            initiatedBy
        });
    }

    /**
     * Mark gateway as unhealthy
     */
    async _markGatewayUnhealthy(gatewayName, recoveryMinutes = 30) {
        console.warn(`⚠️ Marking gateway ${gatewayName} as unhealthy`);
        await PaymentGateway.markUnhealthy(gatewayName, recoveryMinutes);

        // Update local cache
        const provider = this.providers.get(gatewayName);
        if (provider) {
            provider.config.is_healthy = false;
        }
    }

    /**
     * Get health status of all gateways
     */
    async getHealthStatus() {
        await this.loadProviders();

        const healthChecks = await Promise.all(
            Array.from(this.providers.entries()).map(async ([name, provider]) => {
                try {
                    const startTime = Date.now();
                    const isHealthy = await provider.instance.healthCheck();
                    const responseTime = Date.now() - startTime;

                    return {
                        gateway: name,
                        status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
                        response_time_ms: responseTime,
                        mode: provider.config.mode,
                        priority: provider.config.priority,
                        traffic_split: provider.config.traffic_split_percent,
                        tdr_rate: provider.config.tdr_rate,
                        stats: provider.stats,
                        last_health_check: new Date()
                    };
                } catch (error) {
                    return {
                        gateway: name,
                        status: 'ERROR',
                        error: error.message,
                        last_health_check: new Date()
                    };
                }
            })
        );

        const healthyCount = healthChecks.filter(h => h.status === 'HEALTHY').length;

        return {
            overall: healthyCount >= 1 ? 'HEALTHY' : 'DEGRADED',
            timestamp: new Date(),
            gateways: healthChecks,
            metrics: {
                total_gateways: this.providers.size,
                healthy_gateways: healthyCount,
                available_capacity: this.providers.size > 0
                    ? Math.round((healthyCount / this.providers.size) * 100)
                    : 0
            }
        };
    }

    /**
     * Set routing strategy
     * @param {string} strategy - PRIORITY, TRAFFIC_SPLIT, or INTELLIGENT
     */
    setRoutingStrategy(strategy) {
        if (['PRIORITY', 'TRAFFIC_SPLIT', 'INTELLIGENT'].includes(strategy)) {
            this.routingStrategy = strategy;
            console.log(`📊 Payment routing strategy set to: ${strategy}`);
        } else {
            throw new Error(`Invalid routing strategy: ${strategy}`);
        }
    }
}

// Export singleton instance
const paymentRouter = new PaymentRouter();
export default paymentRouter;
