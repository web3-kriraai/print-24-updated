import axios from 'axios';

/**
 * GeolocationService - IP-based and GPS-based location services
 * Uses Google Cloud Platform Geolocation and Geocoding APIs
 * 
 * ✅ BILLING ENABLED - Ready to use!
 */
class GeolocationService {
    constructor() {
        this.apiKey = process.env.GCP_GEOLOCATION_API_KEY;

        if (!this.apiKey) {
            console.warn('⚠️ GCP_GEOLOCATION_API_KEY not found in environment variables');
        }

        // Cache for IP to location mappings (24 hour TTL)
        this.ipLocationCache = new Map();
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Get location from IP address using Google Geolocation API
     * Returns lat/lng coordinates
     * @param {string} ip - User's IP address (optional, auto-detected)
     * @returns {Promise<{lat: number, lng: number}>}
     */
    async getLocationFromIP(ip = null) {
        try {
            // Check cache first
            if (ip) {
                const cached = this._getCachedLocation(ip);
                if (cached) {
                    console.log(`📍 Using cached location for IP: ${ip}`);
                    return cached;
                }
            }

            console.log(`🌍 Fetching location from IP using Google Geolocation API`);

            // Google Geolocation API
            const response = await axios.post(
                `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.apiKey}`,
                {
                    considerIp: true
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            const location = response.data.location;

            // Cache the result
            if (ip) {
                this._cacheLocation(ip, location);
            }

            return location; // Returns { lat, lng }
        } catch (error) {
            console.error('❌ Error fetching location from IP:', error.response?.data || error.message);
            throw new Error('Failed to get location from IP');
        }
    }

    /**
     * Reverse geocode lat/lng to get full address including pincode
     * Uses Google Maps Geocoding API
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<{pincode: string, city: string, state: string, country: string, formattedAddress: string}>}
     */
    async reverseGeocode(lat, lng) {
        try {
            console.log(`📍 Reverse geocoding with Google Geocoding API: ${lat}, ${lng}`);

            // Build URL with proper encoding
            const params = new URLSearchParams({
                latlng: `${lat},${lng}`,
                key: this.apiKey
            });

            const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

            const response = await axios.get(url, {
                timeout: 10000
            });

            console.log(`📊 API Response Status: ${response.data.status}`);

            if (response.data.status !== 'OK') {
                console.error(`❌ Geocoding API returned: ${response.data.status}`);
                if (response.data.error_message) {
                    console.error(`   Error message: ${response.data.error_message}`);
                }
                throw new Error(`Geocoding failed: ${response.data.status}`);
            }

            if (!response.data.results || response.data.results.length === 0) {
                throw new Error('No results found for these coordinates');
            }

            const result = response.data.results[0];
            const components = result.address_components;

            // Extract location details
            const locationData = {
                pincode: this._extractComponent(components, 'postal_code'),
                city: this._extractComponent(components, 'locality') ||
                    this._extractComponent(components, 'administrative_area_level_2'),
                state: this._extractComponent(components, 'administrative_area_level_1'),
                country: this._extractComponent(components, 'country'),
                formattedAddress: result.formatted_address
            };

            console.log('✅ Location data extracted:', locationData);
            return locationData;
        } catch (error) {
            console.error('❌ Error reverse geocoding:', error.message);
            if (error.response?.data) {
                console.error('   API Response:', JSON.stringify(error.response.data));
            }
            throw new Error('Failed to reverse geocode location: ' + error.message);
        }
    }

    /**
     * Complete flow: IP → Lat/Lng → Pincode
     * @param {string} ip - User's IP address
     * @returns {Promise<{pincode: string, city: string, state: string, country: string}>}
     */
    async getPincodeFromIP(ip) {
        try {
            // Step 1: Get lat/lng from IP using Google Geolocation API
            const location = await this.getLocationFromIP(ip);

            // Step 2: Reverse geocode to get pincode using Google Geocoding API
            const addressData = await this.reverseGeocode(location.lat, location.lng);

            return addressData;
        } catch (error) {
            console.error('❌ Error getting pincode from IP:', error.message);
            throw error;
        }
    }

    /**
     * Process GPS coordinates from browser
     * @param {number} lat - Latitude from browser GPS
     * @param {number} lng - Longitude from browser GPS
     * @returns {Promise<{pincode: string, city: string, state: string, country: string}>}
     */
    async getPincodeFromGPS(lat, lng) {
        try {
            const addressData = await this.reverseGeocode(lat, lng);
            return addressData;
        } catch (error) {
            console.error('❌ Error getting pincode from GPS:', error.message);
            throw error;
        }
    }

    /**
     * Extract specific address component
     * @private
     */
    _extractComponent(components, type) {
        const component = components.find(c => c.types.includes(type));
        return component?.long_name || null;
    }

    /**
     * Get cached location for IP
     * @private
     */
    _getCachedLocation(ip) {
        const cached = this.ipLocationCache.get(ip);

        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.ipLocationCache.delete(ip);
            return null;
        }

        return cached.location;
    }

    /**
     * Cache location for IP
     * @private
     */
    _cacheLocation(ip, location) {
        this.ipLocationCache.set(ip, {
            location,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache (for testing/maintenance)
     */
    clearCache() {
        this.ipLocationCache.clear();
        console.log('🗑️ Geolocation cache cleared');
    }
}

export default new GeolocationService();
