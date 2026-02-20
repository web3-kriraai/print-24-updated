/**
 * Encryption Service
 * AES-256-GCM encryption for payment gateway secrets
 * @module services/encryption.service
 */

import crypto from 'crypto';

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyInitialized = false;
        this.key = null;
    }

    /**
     * Initialize the encryption key from environment
     * Called lazily on first encrypt/decrypt operation
     */
    _initKey() {
        if (this.keyInitialized) return;

        // Sanitize key (remove quotes if present)
        const keyHex = process.env.ENCRYPTION_KEY ?
            process.env.ENCRYPTION_KEY.replace(/^["']|["']$/g, '').trim() :
            undefined;

        if (!keyHex) {
            console.warn('⚠️ ENCRYPTION_KEY not set. Payment secrets will not be encrypted.');
            this.key = null;
            this.keyInitialized = true;
            return;
        }

        if (keyHex.length !== 64) {
            // Generate a random key for dev if invalid, but warn
            console.warn(
                `Invalid ENCRYPTION_KEY length. Expected 64 hex characters (32 bytes), got ${keyHex.length}. ` +
                `Using a temporary random key.`
            );
            this.key = crypto.randomBytes(32);
            this.keyInitialized = true;
            return;
        }

        this.key = Buffer.from(keyHex, 'hex');
        this.keyInitialized = true;
    }

    /**
     * Encrypt a plaintext string
     * @param {string} text - Plaintext to encrypt
     * @returns {string} Encrypted string in format: iv:authTag:ciphertext
     */
    encrypt(text) {
        if (!text) return text;

        this._initKey();

        // If no key, return plaintext (for development without encryption)
        if (!this.key) {
            console.warn('⚠️ Storing unencrypted secret (ENCRYPTION_KEY not set)');
            return text;
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:encryptedText
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt an encrypted string
     * @param {string} encryptedText - Encrypted string in format: iv:authTag:ciphertext
     * @returns {string} Decrypted plaintext
     */
    decrypt(encryptedText) {
        if (!encryptedText) return encryptedText;

        this._initKey();

        // If no key or text doesn't look encrypted, return as-is
        if (!this.key) {
            return encryptedText;
        }

        // Check if it's in our encrypted format (3 parts separated by colons)
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            // Not encrypted or different format, return as-is
            return encryptedText;
        }

        try {
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];

            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('❌ Decryption failed:', error.message);
            // Don't throw to avoid crashing UI
            return encryptedText;
        }
    }

    /**
     * Mask a secret for display (e.g., in admin UI)
     * @param {string} secret - Secret to mask
     * @param {number} visibleChars - Number of characters to show at end
     * @returns {string} Masked secret like "sk_...X92"
     */
    maskSecret(secret, visibleChars = 4) {
        if (!secret || secret.length <= visibleChars) {
            return '••••••••';
        }

        // If encrypted, don't try to mask - just show generic mask
        if (secret.includes(':')) {
            return '••••••••';
        }

        const prefix = secret.substring(0, 3);
        const lastChars = secret.slice(-visibleChars);
        return `${prefix}...${lastChars}`;
    }

    /**
     * Check if a string is encrypted (in our format)
     * @param {string} text - Text to check
     * @returns {boolean} True if encrypted
     */
    isEncrypted(text) {
        if (!text || typeof text !== 'string') return false;
        const parts = text.split(':');
        if (parts.length !== 3) return false;
        // Check if parts look like hex strings
        return /^[a-f0-9]+$/i.test(parts[0]) && /^[a-f0-9]+$/i.test(parts[1]);
    }
}

// Export singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;
