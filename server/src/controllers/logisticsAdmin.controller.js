/**
 * Logistics Admin Controller
 * 
 * Admin endpoints for managing logistics providers:
 * - List all providers
 * - Toggle provider active status
 * - Update API credentials (encrypted)
 * - Test provider connection
 * 
 * @module controllers/logisticsAdmin.controller
 */

import LogisticsProvider from '../models/LogisticsProvider.js';
import shiprocketService from '../services/courier/ShiprocketService.js';
import crypto from 'crypto';

// Encryption key (in production, use env variable)
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'logistics-credentials-key-32ch';
const IV_LENGTH = 16;

/**
 * Encrypt sensitive credentials
 */
function encryptCredentials(credentials) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt credentials
 */
function decryptCredentials(encryptedData) {
    try {
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Failed to decrypt credentials:', error);
        return null;
    }
}

/**
 * GET /api/admin/logistics-providers
 * Get all logistics providers
 */
export const getAllProviders = async (req, res) => {
    try {
        const providers = await LogisticsProvider.find({})
            .select('-apiCredentials') // Don't expose credentials
            .sort({ priority: -1 });

        // Add hasCredentials flag
        const providersWithMeta = await Promise.all(providers.map(async (p) => {
            const fullProvider = await LogisticsProvider.findById(p._id).select('+apiCredentials');
            return {
                ...p.toObject(),
                hasCredentials: !!fullProvider.apiCredentials
            };
        }));

        res.json({
            success: true,
            providers: providersWithMeta
        });
    } catch (error) {
        console.error('[LogisticsAdmin] Error fetching providers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PUT /api/admin/logistics-providers/:id
 * Update provider (toggle active, priority, etc.)
 */
export const updateProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, priority, displayName, averageDeliveryTime, supportsCOD, supportsReverse } = req.body;

        const updateData = {};
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (typeof priority === 'number') updateData.priority = priority;
        if (displayName) updateData.displayName = displayName;
        if (typeof averageDeliveryTime === 'number') updateData.averageDeliveryTime = averageDeliveryTime;
        if (typeof supportsCOD === 'boolean') updateData.supportsCOD = supportsCOD;
        if (typeof supportsReverse === 'boolean') updateData.supportsReverse = supportsReverse;

        const provider = await LogisticsProvider.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).select('-apiCredentials');

        if (!provider) {
            return res.status(404).json({ success: false, error: 'Provider not found' });
        }

        console.log(`[LogisticsAdmin] Provider ${provider.name} updated:`, updateData);

        res.json({
            success: true,
            provider
        });
    } catch (error) {
        console.error('[LogisticsAdmin] Error updating provider:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PUT /api/admin/logistics-providers/:id/credentials
 * Update provider API credentials (encrypted)
 */
export const updateCredentials = async (req, res) => {
    try {
        const { id } = req.params;
        const { credentials } = req.body;

        if (!credentials || typeof credentials !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid credentials format' });
        }

        // Encrypt credentials before storing
        const encryptedCredentials = encryptCredentials(credentials);

        const provider = await LogisticsProvider.findByIdAndUpdate(
            id,
            {
                apiCredentials: encryptedCredentials,
                syncStatus: 'PENDING'
            },
            { new: true }
        ).select('-apiCredentials');

        if (!provider) {
            return res.status(404).json({ success: false, error: 'Provider not found' });
        }

        console.log(`[LogisticsAdmin] Credentials updated for provider ${provider.name}`);

        res.json({
            success: true,
            message: 'Credentials saved securely'
        });
    } catch (error) {
        console.error('[LogisticsAdmin] Error updating credentials:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/logistics-providers/:id/test
 * Test provider connection
 */
export const testProviderConnection = async (req, res) => {
    try {
        const { id } = req.params;

        const provider = await LogisticsProvider.findById(id).select('+apiCredentials');

        if (!provider) {
            return res.status(404).json({ success: false, error: 'Provider not found' });
        }

        let testResult = { success: false, error: 'Test not implemented for this provider' };

        switch (provider.name) {
            case 'SHIPROCKET':
                try {
                    // Use stored credentials or env credentials
                    let email = process.env.SHIPROCKET_EMAIL;
                    let password = process.env.SHIPROCKET_API;

                    if (provider.apiCredentials) {
                        const creds = decryptCredentials(provider.apiCredentials);
                        if (creds) {
                            email = creds.email || email;
                            password = creds.password || password;
                        }
                    }

                    // Update service credentials
                    shiprocketService.email = email?.replace(/['"]/g, '').trim();
                    shiprocketService.password = password?.replace(/['"]/g, '').trim();

                    // Test authentication
                    const token = await shiprocketService.authenticate();

                    if (token) {
                        testResult = { success: true, message: 'Authentication successful' };

                        // Update sync status
                        await LogisticsProvider.findByIdAndUpdate(id, {
                            syncStatus: 'OK',
                            lastSyncAt: new Date()
                        });
                    } else {
                        testResult = { success: false, error: 'Authentication failed - no token received' };
                        await LogisticsProvider.findByIdAndUpdate(id, { syncStatus: 'ERROR' });
                    }
                } catch (authError) {
                    testResult = { success: false, error: authError.message };
                    await LogisticsProvider.findByIdAndUpdate(id, { syncStatus: 'ERROR' });
                }
                break;

            case 'INTERNAL':
                // Internal provider always works
                testResult = { success: true, message: 'Internal delivery system operational' };
                await LogisticsProvider.findByIdAndUpdate(id, {
                    syncStatus: 'OK',
                    lastSyncAt: new Date()
                });
                break;

            case 'DELHIVERY':
            case 'BLUEDART':
            case 'DTDC':
            case 'ECOM_EXPRESS':
                // Placeholder for other providers
                testResult = { success: false, error: `${provider.name} integration not yet implemented` };
                break;

            default:
                testResult = { success: false, error: 'Unknown provider' };
        }

        res.json(testResult);
    } catch (error) {
        console.error('[LogisticsAdmin] Error testing provider:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export default {
    getAllProviders,
    updateProvider,
    updateCredentials,
    testProviderConnection
};
