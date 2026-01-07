import { User } from "../models/User.js";
import UserSegment from "../models/UserSegment.js";
import GeoZoneMapping from "../models/GeoZonMapping.js"; // Note: Actual filename is GeoZonMapping.js
import geoip from "geoip-lite";

/**
 * =========================================================================
 * USER CONTEXT SERVICE
 * =========================================================================
 * 
 * Builds pricing context from user data. This context is used by the
 * PricingService to determine which prices to apply.
 * 
 * Context includes:
 * - User Segment (RETAIL, VIP, CORPORATE, etc.)
 * - User Type and Pricing Tier
 * - Territory Access
 * - Geographic Zone (from pincode)
 */

class UserContextService {
    /**
     * Build complete pricing context from authenticated user
     * 
     * @param {Object} user - User object from database
     * @param {String} pincode - Optional pincode override
     * @returns {Object} Pricing context
     */
    async buildUserContext(user, pincode = null) {
        try {
            if (!user) {
                return await this.buildGuestContext(pincode);
            }

            // 1. Resolve User Segment
            let userSegment;
            if (user.userSegment) {
                // User has assigned segment
                if (typeof user.userSegment === 'object' && user.userSegment._id) {
                    userSegment = user.userSegment; // Already populated
                } else {
                    userSegment = await UserSegment.findById(user.userSegment).lean();
                }
            } else {
                // No explicit segment assigned - derive from userType
                // Map userType to segment code
                const userTypeToSegment = {
                    'print partner': 'PRINT_PARTNER',
                    'corporate': 'CORPORATE',
                    'customer': 'RETAIL',
                    'guest': 'RETAIL'
                };
                
                const segmentCode = userTypeToSegment[user.userType] || 'RETAIL';
                
                console.log(`📌 No userSegment assigned. Mapping userType '${user.userType}' → Segment '${segmentCode}'`);
                
                userSegment = await UserSegment.findOne({ code: segmentCode }).lean();
                
                // If specific segment not found, try default
                if (!userSegment) {
                    userSegment = await UserSegment.findOne({ isDefault: true }).lean();
                }
            }

            if (!userSegment) {
                // Fallback to RETAIL if no default segment
                userSegment = await UserSegment.findOne({ code: "RETAIL" }).lean();
            }

            // 2. Resolve Geographic Zone (if pincode provided)
            let geoZone = null;
            let resolvedPincode = pincode;

            if (!resolvedPincode) {
                // Try to get pincode from user's territory access or profile
                // (You might have a defaultAddress field in future)
                resolvedPincode = user.territoryAccess?.[0] || null;
            }

            if (resolvedPincode) {
                geoZone = await this.resolveGeoZone(resolvedPincode);
            }

            // 3. Build context object
            const context = {
                userId: user._id,
                userSegmentId: userSegment?._id,
                userSegmentCode: userSegment?.code,
                userSegmentName: userSegment?.name,
                userTypeId: user.userTypeId || null,
                userType: user.userType || "customer",
                pricingTier: user.pricingTier || 0,
                territoryAccess: user.territoryAccess || [],
                pincode: resolvedPincode,
                geoZoneId: geoZone?._id || null,
                geoZoneName: geoZone?.name || null,
                creditLimit: user.creditLimit || 0,
                paymentTerms: user.paymentTerms || null,
                isAuthenticated: true,
            };

            return context;
        } catch (error) {
            console.error("Error building user context:", error);
            // Fallback to guest context
            return await this.buildGuestContext(pincode);
        }
    }

    /**
     * Build default context for guest users (not logged in)
     * 
     * @param {String} pincode - Optional pincode for geo zone
     * @returns {Object} Guest pricing context
     */
    async buildGuestContext(pincode = null) {
        try {
            // Get default RETAIL segment
            let retailSegment = await UserSegment.findOne({ code: "RETAIL" }).lean();
            
            if (!retailSegment) {
                retailSegment = await UserSegment.findOne({ isDefault: true }).lean();
            }

            // Resolve geo zone if pincode provided
            let geoZone = null;
            if (pincode) {
                geoZone = await this.resolveGeoZone(pincode);
            }

            return {
                userId: null,
                userSegmentId: retailSegment?._id || null,
                userSegmentCode: retailSegment?.code || "RETAIL",
                userSegmentName: retailSegment?.name || "Retail Customer",
                userTypeId: null,
                userType: "guest",
                pricingTier: 0,
                territoryAccess: [],
                pincode: pincode,
                geoZoneId: geoZone?._id || null,
                geoZoneName: geoZone?.name || null,
                creditLimit: 0,
                paymentTerms: "PREPAID",
                isAuthenticated: false,
            };
        } catch (error) {
            console.error("Error building guest context:", error);
            // Return minimal fallback context
            return {
                userId: null,
                userSegmentCode: "RETAIL",
                userType: "guest",
                pricingTier: 0,
                isAuthenticated: false,
            };
        }
    }

    /**
     * Resolve geographic zone from pincode
     * 
     * @param {String} pincode - 6-digit pincode
     * @returns {Object} GeoZone object or null
     */
    async resolveGeoZone(pincode) {
        try {
            if (!pincode) return null;

            // Use the GeoZoneMapping service to resolve
            // This matches the pincode to the correct geographic zone
            const geoZoneMapping = await GeoZoneMapping.findOne({
                pincode: pincode,
            }).populate("geoZone").lean();

            if (geoZoneMapping?.geoZone) {
                return geoZoneMapping.geoZone;
            }

            // Try pattern matching (e.g., 560* matches 560001, 560034, etc.)
            const pincodePrefix = pincode.substring(0, 3);
            const patternMapping = await GeoZoneMapping.findOne({
                pincode: new RegExp(`^${pincodePrefix}`),
            }).populate("geoZone").lean();

            return patternMapping?.geoZone || null;
        } catch (error) {
            console.error("Error resolving geo zone:", error);
            return null;
        }
    }

    /**
     * Quick context builder for pricing requests
     * Combines user and pincode into pricing context
     * 
     * Priority for pincode resolution:
     * 1. Explicit request (body/query)
     * 2. User's default address
     * 3. User's territory access
     * 4. IP-based detection (for guests)
     * 
     * @param {Object} req - Express request object
     * @returns {Object} Pricing context
     */
    async buildContextFromRequest(req) {
        const user = req.user || null;
        
        // Extract pincode with fallback chain
        let pincode = this.extractPincode(req, user);
        
        // If no pincode found, try IP detection (works for ALL users)
        if (!pincode) {
            pincode = await this.getPincodeFromIP(req);
        }

        return await this.buildUserContext(user, pincode);
    }

    /**
     * Extract pincode from request with priority chain
     * 
     * @param {Object} req - Express request
     * @param {Object} user - User object (if authenticated)
     * @returns {String|null} Pincode
     */
    extractPincode(req, user) {
        // 1. Explicit request (highest priority)
        const explicitPincode = req.body?.pincode || req.query?.pincode;
        if (explicitPincode) {
            return explicitPincode.toString().trim();
        }

        // 2. User's default address
        if (user?.defaultAddress?.pincode) {
            return user.defaultAddress.pincode;
        }

        // 3. User's first territory access
        if (user?.territoryAccess && user.territoryAccess.length > 0) {
            return user.territoryAccess[0];
        }

        return null;
    }

    /**
     * Detect pincode from IP address using geoip-lite
     * 
     * @param {Object} req - Express request
     * @returns {String|null} Detected pincode
     */
    async getPincodeFromIP(req) {
        try {
            // Get client IP
            let ip = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress || 
                     req.ip;

            // Clean IP (remove IPv6 prefix, port, etc.)
            ip = ip.replace(/^::ffff:/, '').split(':')[0];

            // Skip localhost and private networks
            if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
                console.log('🏠 Localhost detected, using default pincode');
                return this.getDefaultPincode();
            }
            
            // Skip private network ranges (LAN)
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                console.log('🏠 Private network detected, using default pincode');
                return this.getDefaultPincode();
            }

            // Use geoip-lite for IP to location
            const geo = geoip.lookup(ip);
            if (!geo) {
                console.log(`❌ IP lookup failed for ${ip}`);
                return this.getDefaultPincode();
            }

            console.log(`🌍 IP ${ip} → ${geo.city || 'Unknown'}, ${geo.country}`);

            // Map location to approximate pincode
            const pincode = await this.locationToPincode(geo);
            return pincode || this.getDefaultPincode();

        } catch (error) {
            console.warn('⚠️ IP detection failed:', error.message);
            return this.getDefaultPincode();
        }
    }

    /**
     * Map geo location data to pincode
     * 
     * @param {Object} geo - Geo data from geoip-lite
     * @returns {String|null} Pincode
     */
    async locationToPincode(geo) {
        const { city, region } = geo;

        // City to pincode mapping (major Indian cities)
        const cityToPincode = {
            'Mumbai': '400001',
            'Delhi': '110001',
            'Bangalore': '560001',
            'Bengaluru': '560001',
            'Chennai': '600001',
            'Kolkata': '700001',
            'Hyderabad': '500001',
            'Pune': '411001',
            'Ahmedabad': '380001',
            'Surat': '395001',
            'Jaipur': '302001',
            'Lucknow': '226001',
            'Kanpur': '208001',
            'Nagpur': '440001',
            'Indore': '452001',
            'Thane': '400601',
            'Bhopal': '462001',
            'Visakhapatnam': '530001',
            'Pimpri-Chinchwad': '411017',
            'Patna': '800001'
        };

        if (city && cityToPincode[city]) {
            return cityToPincode[city];
        }

        // Region/state mapping fallback
        const regionToPincode = {
            'MH': '400001', // Maharashtra → Mumbai
            'DL': '110001', // Delhi
            'KA': '560001', // Karnataka → Bangalore
            'TN': '600001', // Tamil Nadu → Chennai
            'WB': '700001', // West Bengal → Kolkata
            'TG': '500001', // Telangana → Hyderabad
            'GJ': '380001', // Gujarat → Ahmedabad
            'RJ': '302001', // Rajasthan → Jaipur
            'UP': '226001', // Uttar Pradesh → Lucknow
        };

        if (region && regionToPincode[region]) {
            return regionToPincode[region];
        }

        return null;
    }

    /**
     * Get system default pincode
     * 
     * @returns {String} Default pincode
     */
    getDefaultPincode() {
        return process.env.DEFAULT_PINCODE || '400001'; // Mumbai
    }

    /**
     * Validate if user has access to a specific territory
     * 
     * @param {Object} user - User object
     * @param {String} pincode - Pincode to check
     * @returns {Boolean} Has access
     */
    hasTerritortyAccess(user, pincode) {
        if (!user?.territoryAccess || user.territoryAccess.length === 0) {
            // No restrictions = full access
            return true;
        }

        // Check if pincode matches any territory pattern
        return user.territoryAccess.some((territory) => {
            if (territory.includes("*")) {
                // Pattern matching (e.g., "560*")
                const pattern = territory.replace("*", ".*");
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(pincode);
            } else {
                // Exact match
                return territory === pincode;
            }
        });
    }
}

export default new UserContextService();
