/**
 * Payment Gateway Model
 * Stores payment gateway configurations with encrypted credentials
 * @module models/PaymentGateway
 */

import mongoose from 'mongoose';
import encryptionService from '../services/encryption.service.js';

const PaymentGatewaySchema = new mongoose.Schema({
  // Gateway identification
  name: {
    type: String,
    enum: ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYU', 'CASHFREE'],
    required: true,
    unique: true
  },
  display_name: {
    type: String,
    required: true
  },

  // Orchestration fields
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  traffic_split_percent: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },

  // Mode configuration
  mode: {
    type: String,
    enum: ['SANDBOX', 'PRODUCTION'],
    default: 'SANDBOX'
  },

  // Encrypted credentials (hidden by default in queries)
  live_public_key: {
    type: String,
    select: false
  },
  live_secret_key: {
    type: String,
    select: false
  },
  test_public_key: {
    type: String,
    select: false
  },
  test_secret_key: {
    type: String,
    select: false
  },

  // Gateway capabilities
  supported_countries: [{
    type: String,
    default: 'IN'
  }],
  supported_currencies: [{
    type: String,
    default: 'INR'
  }],
  supported_methods: [{
    type: String,
    enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'QR', 'BANK_TRANSFER']
  }],

  // Transaction limits (in base currency units)
  min_amount: {
    type: Number,
    default: 1
  },
  max_amount: {
    type: Number,
    default: 10000000 // 1 crore
  },

  // Health monitoring
  last_health_check: Date,
  failure_count: {
    type: Number,
    default: 0
  },
  is_healthy: {
    type: Boolean,
    default: true
  },

  // TDR (Transaction Discount Rate) tracking
  tdr_rate: {
    type: Number,
    default: 2.0 // 2% default
  },
  last_tdr_update: Date,

  // Split payments configuration (future-proofing)
  supports_split_payments: {
    type: Boolean,
    default: false
  },
  split_config: {
    platform_account_id: String,
    settlement_cycle: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY']
    }
  },

  // Webhook configuration
  webhook_url: String,
  callback_url: String,

  // Gateway-specific configuration (flexible)
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Metadata
  notes: String

}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/* =====================
   INDEXES
====================== */
PaymentGatewaySchema.index({ is_active: 1, priority: 1 });
PaymentGatewaySchema.index({ is_healthy: 1, is_active: 1 });

/* =====================
   PRE-SAVE HOOK - Encrypt secrets
====================== */
PaymentGatewaySchema.pre('save', function (next) {
  const encryptIfNeeded = (fieldName) => {
    if (this.isModified(fieldName) && this[fieldName]) {
      // Only encrypt if not already encrypted
      if (!encryptionService.isEncrypted(this[fieldName])) {
        this[fieldName] = encryptionService.encrypt(this[fieldName]);
      }
    }
  };

  encryptIfNeeded('live_secret_key');
  encryptIfNeeded('test_secret_key');

  next();
});

/* =====================
   INSTANCE METHODS
====================== */

/**
 * Get the appropriate public key based on current mode
 * @returns {string} Public key (unencrypted)
 */
PaymentGatewaySchema.methods.getPublicKey = function () {
  if (this.mode === 'PRODUCTION') {
    return this.live_public_key;
  }
  return this.test_public_key;
};

/**
 * Get the appropriate secret key based on current mode (decrypted)
 * @returns {string} Decrypted secret key
 */
PaymentGatewaySchema.methods.getSecretKey = function () {
  let encryptedKey;
  if (this.mode === 'PRODUCTION') {
    encryptedKey = this.live_secret_key;
  } else {
    encryptedKey = this.test_secret_key;
  }
  return encryptionService.decrypt(encryptedKey);
};



/**
 * Get masked versions of keys for admin display
 * @returns {Object} Object with masked key values
 */
PaymentGatewaySchema.methods.getMaskedKeys = function () {
  return {
    live_public_key: this.live_public_key
      ? encryptionService.maskSecret(this.live_public_key)
      : null,
    live_secret_key: this.live_secret_key ? '••••••••' : null,
    test_public_key: this.test_public_key
      ? encryptionService.maskSecret(this.test_public_key)
      : null,
    test_secret_key: this.test_secret_key ? '••••••••' : null
  };
};

/**
 * Get full configuration for provider initialization
 * @returns {Object} Provider configuration
 */
PaymentGatewaySchema.methods.getProviderConfig = function () {
  return {
    publicKey: this.getPublicKey(),
    secretKey: this.getSecretKey(),
    mode: this.mode,
    isSandbox: this.mode === 'SANDBOX',
    ...this.config
  };
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Get all active and healthy gateways sorted by priority
 * @returns {Promise<Array>} Active gateways
 */
PaymentGatewaySchema.statics.getActiveGateways = function () {
  return this.find({
    is_active: true
  })
    .select('+live_public_key +live_secret_key +test_public_key +test_secret_key')
    .sort({ priority: 1 });
};

/**
 * Get gateway by name with credentials
 * @param {string} name - Gateway name (RAZORPAY, STRIPE, etc.)
 * @returns {Promise<Document|null>} Gateway document
 */
PaymentGatewaySchema.statics.getByNameWithCredentials = function (name) {
  return this.findOne({ name })
    .select('+live_public_key +live_secret_key +test_public_key +test_secret_key');
};

/**
 * Mark a gateway as unhealthy
 * @param {string} name - Gateway name
 * @param {number} recoveryMinutes - Minutes before auto-recovery attempt
 */
PaymentGatewaySchema.statics.markUnhealthy = async function (name, recoveryMinutes = 30) {
  await this.findOneAndUpdate(
    { name },
    {
      $set: { is_healthy: false },
      $inc: { failure_count: 1 }
    }
  );

  // Schedule recovery
  setTimeout(async () => {
    await this.findOneAndUpdate({ name }, { is_healthy: true });
    console.log(`🔄 Gateway ${name} marked healthy after recovery period`);
  }, recoveryMinutes * 60 * 1000);
};

/**
 * Reset failure count for a gateway
 * @param {string} name - Gateway name
 */
PaymentGatewaySchema.statics.resetFailures = function (name) {
  return this.findOneAndUpdate(
    { name },
    { failure_count: 0, is_healthy: true }
  );
};

const PaymentGateway = mongoose.model('PaymentGateway', PaymentGatewaySchema);

export default PaymentGateway;