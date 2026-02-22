import geoip from 'geoip-lite';
import { Country, State, City } from 'country-state-city';

/**
 * GeolocationService
 * 
 * Provides IP-based geolocation and pincode mapping services
 * 
 * Features:
 * - IP → Location detection
 * - Pincode → Location lookup
 * - Location → Pincode ranges (for known regions)
 */
class GeolocationService {
    /**
     * Detect location from IP address
     * @param {string} ipAddress - IP address to lookup
     * @returns {Object|null} Location data
     */
    detectFromIP(ipAddress) {
        try {
            // Handle localhost/private IPs
            if (this.isLocalIP(ipAddress)) {
                return this.getDefaultLocation();
            }

            // Lookup IP using geoip-lite
            const geo = geoip.lookup(ipAddress);
            if (!geo) {
                console.log(`❌ IP lookup failed for ${ipAddress}`);
                return null;
            }

            // Get country and state details from country-state-city
            const country = Country.getCountryByCode(geo.country);
            const state = State.getStateByCodeAndCountry(geo.region, geo.country);

            // Get approximate zipcode (for supported countries)
            const zipCode = this.getZipCodeFromGeo(geo);

            return {
                ip: ipAddress,
                country: geo.country,
                countryName: country?.name || geo.country,
                region: geo.region,
                regionName: state?.name || geo.region,
                city: geo.city || null,
                timezone: geo.timezone,
                coordinates: geo.ll, // [latitude, longitude]
                zipCode: zipCode,
                currency: country?.currency || 'USD',
                detected: true,
                source: 'ip-geolocation'
            };

        } catch (error) {
            console.error('IP detection error:', error);
            return null;
        }
    }

    /**
     * Lookup location by pincode/zipcode
     * @param {string} pincode - Postal code
     * @param {string} countryCode - ISO country code (default: IN)
     * @returns {Promise<Object|null>} Location data
     */
    async lookupByPincode(pincode, countryCode = 'IN') {
        try {
            if (!pincode) return null;

            if (countryCode === 'IN') {
                return await this.lookupIndianPincode(pincode);
            }

            // For other countries, use basic mapping
            return await this.lookupInternationalPincode(pincode, countryCode);

        } catch (error) {
            console.error('Pincode lookup error:', error);
            return null;
        }
    }

    /**
     * Get pincode ranges for a location (reverse lookup)
     * @param {Object} location - Location object with country, state, city
     * @returns {Object} Pincode range data
     */
    getPincodeRangesForLocation(location) {
        const { country, region, city } = location;

        // For India, we have detailed mapping
        if (country === 'IN') {
            return this.getIndianPincodeRanges(region, city);
        }

        // For other countries, return null (requires external API)
        return {
            available: false,
            message: 'Pincode ranges not available for this location',
            suggestion: 'Please enter manually'
        };
    }

    /**
     * Lookup Indian pincode
     * @private
     */
    async lookupIndianPincode(pincode) {
        // City to pincode mapping (major Indian cities)
        const pincodeToLocation = {
            '400': { city: 'Mumbai', region: 'MH', regionName: 'Maharashtra' },
            '110': { city: 'Delhi', region: 'DL', regionName: 'Delhi' },
            '560': { city: 'Bangalore', region: 'KA', regionName: 'Karnataka' },
            '600': { city: 'Chennai', region: 'TN', regionName: 'Tamil Nadu' },
            '700': { city: 'Kolkata', region: 'WB', regionName: 'West Bengal' },
            '500': { city: 'Hyderabad', region: 'TG', regionName: 'Telangana' },
            '411': { city: 'Pune', region: 'MH', regionName: 'Maharashtra' },
            '380': { city: 'Ahmedabad', region: 'GJ', regionName: 'Gujarat' },
            '395': { city: 'Surat', region: 'GJ', regionName: 'Gujarat' },
            '302': { city: 'Jaipur', region: 'RJ', regionName: 'Rajasthan' },
            '226': { city: 'Lucknow', region: 'UP', regionName: 'Uttar Pradesh' },
            '208': { city: 'Kanpur', region: 'UP', regionName: 'Uttar Pradesh' },
            '440': { city: 'Nagpur', region: 'MH', regionName: 'Maharashtra' },
            '452': { city: 'Indore', region: 'MP', regionName: 'Madhya Pradesh' },
            '462': { city: 'Bhopal', region: 'MP', regionName: 'Madhya Pradesh' },
            '530': { city: 'Visakhapatnam', region: 'AP', regionName: 'Andhra Pradesh' },
            '800': { city: 'Patna', region: 'BR', regionName: 'Bihar' },
        };

        // Get first 3 digits of pincode
        const prefix = pincode.substring(0, 3);
        const locationData = pincodeToLocation[prefix];

        if (locationData) {
            const country = Country.getCountryByCode('IN');
            return {
                zipCode: pincode,
                country: 'IN',
                countryName: 'India',
                region: locationData.region,
                regionName: locationData.regionName,
                city: locationData.city,
                currency: 'INR',
                source: 'pincode-lookup'
            };
        }

        return null;
    }

    /**
     * Get pincode ranges for Indian states/cities
     * @private
     */
    getIndianPincodeRanges(region, city) {
        const stateRanges = {
            'MH': { start: '400001', end: '445402', name: 'Maharashtra' },
            'DL': { start: '110001', end: '110097', name: 'Delhi' },
            'KA': { start: '560001', end: '591346', name: 'Karnataka' },
            'TN': { start: '600001', end: '643253', name: 'Tamil Nadu' },
            'WB': { start: '700001', end: '743711', name: 'West Bengal' },
            'TG': { start: '500001', end: '509412', name: 'Telangana' },
            'GJ': { start: '360001', end: '396590', name: 'Gujarat' },
            'RJ': { start: '301001', end: '345034', name: 'Rajasthan' },
            'UP': { start: '201001', end: '285223', name: 'Uttar Pradesh' },
            'MP': { start: '450001', end: '488448', name: 'Madhya Pradesh' },
            'AP': { start: '515001', end: '535594', name: 'Andhra Pradesh' },
            'BR': { start: '800001', end: '855117', name: 'Bihar' },
        };

        const range = stateRanges[region];
        if (range) {
            return {
                available: true,
                start: range.start,
                end: range.end,
                region: region,
                regionName: range.name
            };
        }

        return {
            available: false,
            message: 'Pincode range not available for this region'
        };
    }

    /**
     * Lookup international pincode (basic implementation)
     * @private
     */
    async lookupInternationalPincode(pincode, countryCode) {
        // This is a placeholder - would need external API for real implementation
        const country = Country.getCountryByCode(countryCode);
        return {
            zipCode: pincode,
            country: countryCode,
            countryName: country?.name || countryCode,
            currency: country?.currency || 'USD',
            source: 'basic-mapping',
            note: 'Limited information available for international postcodes'
        };
    }

    /**
     * Get zipcode from geo data
     * @private
     */
    getZipCodeFromGeo(geo) {
        const { city, region, country } = geo;

        // For India
        if (country === 'IN') {
            const cityToZip = {
                'Mumbai': '400001',
                'Delhi': '110001',
                'Bangalore': '560001',
                'Bengaluru': '560001',
                'Chennai': '600001',
                'Kolkata': '700001',
                'Hyderabad': '500001',
                'Pune': '411001',
                'Ahmedabad': '380001',
            };

            return cityToZip[city] || null;
        }

        return null;
    }

    /**
     * Check if IP is local/private
     * @private
     */
    isLocalIP(ip) {
        return (
            ip === '127.0.0.1' ||
            ip === '::1' ||
            ip === 'localhost' ||
            ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            ip.startsWith('172.')
        );
    }

    /**
     * Get default location (fallback)
     * @private
     */
    getDefaultLocation() {
        return {
            country: 'IN',
            countryName: 'India',
            region: 'MH',
            regionName: 'Maharashtra',
            city: 'Mumbai',
            zipCode: '400001',
            currency: 'INR',
            default: true,
            source: 'default-fallback'
        };
    }
}

export default new GeolocationService();
