/**
 * Abstract Payment Provider Interface
 * All payment gateway implementations must extend this class
 * @module services/payment/IPaymentProvider
 */

/**
 * @typedef {Object} InitializeParams
 * @property {number} amount - Amount in base currency units
 * @property {string} currency - Currency code (INR, USD, etc.)
 * @property {string} orderId - Internal order ID
 * @property {Object} customer - Customer details
 * @property {string} customer.id - Customer ID
 * @property {string} customer.name - Customer name
 * @property {string} customer.email - Customer email
 * @property {string} customer.phone - Customer phone
 * @property {Object} [notes] - Additional notes/metadata
 */

/**
 * @typedef {Object} InitializeResult
 * @property {string} gatewayOrderId - Gateway's order/session ID
 * @property {Object} checkoutData - Data for frontend SDK
 * @property {string} [checkoutUrl] - Redirect URL (for redirect-based flows)
 * @property {Date} expiresAt - When the payment link expires
 */

/**
 * @typedef {Object} StatusResult
 * @property {string} status - Normalized status (SUCCESS, FAILED, PENDING)
 * @property {number} amount - Amount in base currency units
 * @property {string} currency - Currency code
 * @property {string} gatewayTransactionId - Gateway's transaction ID
 * @property {string} [paymentMethod] - Payment method used
 * @property {Object} [methodDetails] - Method-specific details
 * @property {Date} [capturedAt] - When payment was captured
 */

/**
 * @typedef {Object} RefundResult
 * @property {string} refundId - Gateway's refund ID
 * @property {string} status - Refund status
 * @property {number} amount - Refunded amount
 * @property {Date} processedAt - When refund was processed
 */

class IPaymentProvider {
    /**
     * Create a new payment provider instance
     * @param {Object} config - Provider configuration
     * @param {string} config.publicKey - Public/Publishable key
     * @param {string} config.secretKey - Secret/Private key
     * @param {string} [config.webhookSecret] - Webhook verification secret
     * @param {string} config.mode - SANDBOX or PRODUCTION
     * @param {boolean} isSandbox - Whether running in sandbox mode
     */
    constructor(config, isSandbox = false) {
        if (new.target === IPaymentProvider) {
            throw new Error('Cannot instantiate abstract class IPaymentProvider directly');
        }
        this.config = config;
        this.isSandbox = isSandbox;
        this.name = 'UNKNOWN';
    }

    /**
     * Initialize a payment transaction
     * Creates an order/session with the gateway
     * @param {InitializeParams} params - Transaction parameters
     * @returns {Promise<InitializeResult>} Checkout data for frontend
     */
    async initializeTransaction(params) {
        throw new Error('Method initializeTransaction() must be implemented');
    }

    /**
     * Verify webhook/callback signature
     * @param {Object} payload - Webhook payload
     * @param {string} signature - Signature from headers
     * @returns {Promise<boolean>} True if signature is valid
     */
    async verifySignature(payload, signature) {
        throw new Error('Method verifySignature() must be implemented');
    }

    /**
     * Process a refund
     * @param {Object} params - Refund parameters
     * @param {string} params.transactionId - Gateway's transaction/payment ID
     * @param {number} params.amount - Amount to refund
     * @param {string} [params.reason] - Refund reason
     * @param {string} [params.initiatedBy] - User ID who initiated
     * @returns {Promise<RefundResult>} Refund result
     */
    async processRefund(params) {
        throw new Error('Method processRefund() must be implemented');
    }

    /**
     * Check payment status with gateway
     * @param {string} transactionId - Gateway's order/transaction ID
     * @returns {Promise<StatusResult>} Current payment status
     */
    async checkStatus(transactionId) {
        throw new Error('Method checkStatus() must be implemented');
    }

    /**
     * Get refund status
     * @param {string} refundId - Gateway's refund ID
     * @returns {Promise<Object>} Refund status
     */
    async getRefundStatus(refundId) {
        throw new Error('Method getRefundStatus() must be implemented');
    }

    /**
     * Health check - verify gateway connectivity
     * @returns {Promise<boolean>} True if gateway is reachable
     */
    async healthCheck() {
        // Default implementation - override for specific checks
        return true;
    }

    /**
     * Create a split/route payment (for multi-vendor)
     * @param {Object} params - Split payment parameters
     * @returns {Promise<Object>} Split payment result
     */
    async createSplitPayment(params) {
        throw new Error('Split payments not supported by this provider');
    }

    /**
     * Get supported payment methods for this gateway
     * @returns {string[]} List of supported methods
     */
    getSupportedMethods() {
        return ['UPI', 'CARD', 'NETBANKING', 'WALLET'];
    }

    /**
     * Validate configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfig() {
        if (!this.config.publicKey) {
            console.warn(`⚠️ ${this.name}: Missing public key`);
            return false;
        }
        if (!this.config.secretKey) {
            console.warn(`⚠️ ${this.name}: Missing secret key`);
            return false;
        }
        return true;
    }

    /**
     * Normalize amount to gateway's expected format
     * Override if gateway uses different unit (e.g., paise vs rupees)
     * @param {number} amount - Amount in base units
     * @returns {number} Amount in gateway's expected format
     */
    normalizeAmount(amount) {
        return amount;
    }

    /**
     * Denormalize amount from gateway's format to base units
     * @param {number} amount - Amount from gateway
     * @returns {number} Amount in base currency units
     */
    denormalizeAmount(amount) {
        return amount;
    }

    /**
     * Map gateway-specific status to normalized status
     * @param {string} gatewayStatus - Status from gateway
     * @returns {string} Normalized status (SUCCESS, FAILED, PENDING)
     */
    normalizeStatus(gatewayStatus) {
        return 'PENDING';
    }
}

export default IPaymentProvider;
