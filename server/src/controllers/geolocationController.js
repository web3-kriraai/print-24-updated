import GeolocationService from '../services/GeolocationService.js';

/**
 * Get user location from IP address
 * Auto-detects IP from request if not provided
 */
export const getLocationFromIP = async (req, res) => {
    try {
        // Get IP from request headers (handles proxies, Cloud Run, etc.)
        const ip = req.body.ip ||
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress;

        console.log(`📍 Location request from IP: ${ip}`);

        // DEVELOPMENT FALLBACK: For localhost, use test pincode
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
            console.log('🔧 Development mode - using fallback pincode (Surat/West India)');
            return res.json({
                success: true,
                data: {
                    ip: ip || 'localhost',
                    pincode: '395004',
                    city: 'Surat',
                    state: 'Gujarat',
                    country: 'India',
                    source: 'DEVELOPMENT_FALLBACK'
                }
            });
        }

        const locationData = await GeolocationService.getPincodeFromIP(ip);

        res.json({
            success: true,
            data: {
                ip,
                ...locationData
            }
        });
    } catch (error) {
        console.error('❌ Error in getLocationFromIP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get location from IP',
            message: error.message
        });
    }
};

/**
 * Get location details from GPS coordinates
 * Expects lat and lng in request body
 */
export const getLocationFromGPS = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        console.log(`📍 GPS location request: ${lat}, ${lng}`);

        const locationData = await GeolocationService.getPincodeFromGPS(
            parseFloat(lat),
            parseFloat(lng)
        );

        res.json({
            success: true,
            data: {
                lat,
                lng,
                ...locationData
            }
        });
    } catch (error) {
        console.error('❌ Error in getLocationFromGPS:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get location from GPS',
            message: error.message
        });
    }
};

/**
 * Validate and get location data
 * This is a smart endpoint that tries multiple methods:
 * 1. Use GPS coordinates if provided
 * 2. Fall back to IP if no GPS
 * 3. Allow manual pincode override
 */
export const getLocation = async (req, res) => {
    try {
        const { lat, lng, pincode } = req.body;

        // If pincode is manually provided, validate it
        if (pincode) {
            console.log(`📍 Using manually provided pincode: ${pincode}`);
            return res.json({
                success: true,
                data: {
                    pincode,
                    source: 'manual'
                }
            });
        }

        // If GPS coordinates provided, use them
        if (lat && lng) {
            console.log(`📍 Using GPS coordinates: ${lat}, ${lng}`);
            const locationData = await GeolocationService.getPincodeFromGPS(
                parseFloat(lat),
                parseFloat(lng)
            );

            return res.json({
                success: true,
                data: {
                    ...locationData,
                    source: 'gps'
                }
            });
        }

        // Fallback to IP-based location
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress;

        console.log(`📍 Falling back to IP-based location: ${ip}`);

        if (!ip || ip === '::1' || ip === '127.0.0.1') {
            return res.status(400).json({
                success: false,
                error: 'Cannot determine location. Please provide GPS coordinates or pincode.',
                requiresManualInput: true
            });
        }

        const locationData = await GeolocationService.getPincodeFromIP(ip);

        res.json({
            success: true,
            data: {
                ...locationData,
                source: 'ip'
            }
        });
    } catch (error) {
        console.error('❌ Error in getLocation:', error);

        // Suggest manual input on failure
        res.status(500).json({
            success: false,
            error: 'Failed to automatically determine location',
            message: error.message,
            requiresManualInput: true
        });
    }
};

/**
 * Clear geolocation cache (admin only)
 */
export const clearCache = async (req, res) => {
    try {
        GeolocationService.clearCache();
        res.json({
            success: true,
            message: 'Geolocation cache cleared'
        });
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
};
