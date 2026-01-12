import { User } from "../models/User.js";
import UserSegment from "../models/UserSegment.js";
import GeoZoneMapping from "../models/GeoZonMapping.js"; // Note: Actual filename is GeoZonMapping.js
import GeoZone from "../models/GeoZon.js";
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
    async buildUserContext(user, locationOrPincode = null) {
        try {
            // Normalize location input
            let locationData = null;
            if (locationOrPincode) {
                if (typeof locationOrPincode === 'string') {
                    locationData = { pincode: locationOrPincode };
                } else {
                    locationData = locationOrPincode;
                }
            }

            if (!user) {
                return await this.buildGuestContext(locationData);
            }

            // 1. Resolve User Segment
            let userSegment;

            console.log(`\n🔍 USER SEGMENT RESOLUTION for user: ${user.email || user._id}`);
            // ... (logging) ...

            if (user.userSegment) {
                // ... (segment resolution) ...
                if (typeof user.userSegment === 'object' && user.userSegment._id) {
                    userSegment = user.userSegment;
                } else {
                    userSegment = await UserSegment.findById(user.userSegment).lean();
                }
            } else {
                // ... (derive from userType) ...
                const userTypeToSegment = {
                    'print partner': 'PRINT_PARTNER',
                    'corporate': 'CORPORATE',
                    'customer': 'RETAIL',
                    'guest': 'RETAIL'
                };
                const normalizedUserType = (user.userType || 'customer').toLowerCase().trim();
                const segmentCode = userTypeToSegment[normalizedUserType] || 'RETAIL';

                userSegment = await UserSegment.findOne({ code: segmentCode }).lean();
                if (!userSegment) {
                    userSegment = await UserSegment.findOne({ isDefault: true }).lean();
                }
            }
            if (!userSegment) userSegment = await UserSegment.findOne({ code: "RETAIL" }).lean();


            // 2. Resolve Geographic Zone
            let geoZone = null;

            // If no location provided, check user profile
            if (!locationData) {
                if (user?.territoryAccess?.[0]) {
                    locationData = { pincode: user.territoryAccess[0] };
                }
            }

            if (locationData) {
                // A. Try Pincode Match (Micro Zone) - Highest Priority
                if (locationData.pincode) {
                    geoZone = await this.resolveGeoZone(locationData.pincode);
                }

                // B. Try Macro Match (ISO Code) if no micro zone found
                if (!geoZone && (locationData.country || locationData.region)) {
                    geoZone = await this.resolveMacroZone(locationData);
                }
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
                pincode: locationData?.pincode || null,
                country: locationData?.country || null, // Added to context
                region: locationData?.region || null,   // Added to context
                geoZoneId: geoZone?._id || null,
                geoZoneName: geoZone?.name || null,
                creditLimit: user.creditLimit || 0,
                paymentTerms: user.paymentTerms || null,
                isAuthenticated: true,
            };

            return context;
        } catch (error) {
            console.error("Error building user context:", error);
            return await this.buildGuestContext(pincode);
        }
    }

    /**
     * Build default context for guest users (not logged in)
     */
    async buildGuestContext(locationOrPincode = null) {
        try {
            // Get default RETAIL segment
            let retailSegment = await UserSegment.findOne({ code: "RETAIL" }).lean();
            if (!retailSegment) retailSegment = await UserSegment.findOne({ isDefault: true }).lean();

            // Normalize location input
            let locationData = null;
            if (locationOrPincode) {
                if (typeof locationOrPincode === 'string') {
                    locationData = { pincode: locationOrPincode };
                } else {
                    locationData = locationOrPincode;
                }
            }

            // Resolve geo zone
            let geoZone = null;

            // Note: We don't do IP lookup here anymore, it must be passed in

            if (locationData) {
                if (locationData.pincode) {
                    geoZone = await this.resolveGeoZone(locationData.pincode);
                }
                if (!geoZone && (locationData.country || locationData.region)) {
                    geoZone = await this.resolveMacroZone(locationData);
                }
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
                pincode: locationData?.pincode || null,
                country: locationData?.country || null,
                region: locationData?.region || null,
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

            console.log(`🔍 Resolving GeoZone for pincode: ${pincode}`);

            // Convert pincode to number for range comparison
            const pincodeNum = parseInt(pincode);

            if (isNaN(pincodeNum)) {
                console.log(`❌ Invalid pincode format: ${pincode}`);
                return null;
            }

            // Query by pincode RANGE (pincodeStart to pincodeEnd)
            const geoZoneMapping = await GeoZoneMapping.findOne({
                pincodeStart: { $lte: pincodeNum },
                pincodeEnd: { $gte: pincodeNum }
            }).populate("geoZone").lean();

            if (geoZoneMapping?.geoZone) {
                console.log(`✅ Found GeoZone: ${geoZoneMapping.geoZone.name} (${geoZoneMapping.pincodeStart}-${geoZoneMapping.pincodeEnd})`);
                return geoZoneMapping.geoZone;
            }

            console.log(`⚠️ No GeoZone mapping found for pincode: ${pincode}`);
            return null;
        } catch (error) {
            console.error("Error resolving geo zone:", error);
            return null;
        }
    }

    /**
     * Get full location details from IP
     */
    async getLocationFromIP(req) {
        try {
            // Get client IP
            let ip = req.headers['x-forwarded-for']?.split(',')[0] ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                req.ip;

            // Clean IP
            ip = ip.replace(/^::ffff:/, '').split(':')[0];

            // Localhost/Private IP handling
            if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                return { pincode: this.getDefaultPincode() };
            }

            // Lookup IP
            const geo = geoip.lookup(ip);
            if (!geo) {
                console.log(`❌ IP lookup failed for ${ip}`);
                return { pincode: this.getDefaultPincode() };
            }

            console.log(`🌍 IP ${ip} → ${geo.city}, ${geo.region} (${geo.country})`);

            // Try to map to pincode
            const pincode = await this.locationToPincode(geo);

            return {
                pincode: pincode || undefined, // Use undefined so it doesn't override if null
                country: geo.country, // ISO Code (e.g. US)
                region: geo.region,   // ISO Region (e.g. TX)
                city: geo.city
            };

        } catch (error) {
            console.warn('⚠️ IP detection failed:', error.message);
            return { pincode: this.getDefaultPincode() };
        }
    }

    /**
     * Resolve Macro Zone (Country, State, Region) by ISO Code
     */
    async resolveMacroZone(locationData) {
        try {
            const { country, region } = locationData;
            console.log(`🔍 Resolving Macro Zone for: Country=${country}, Region=${region}`);

            const queryCodes = [];
            if (region) queryCodes.push(region);
            if (country) queryCodes.push(country);
            if (region && country) queryCodes.push(`${country}-${region}`); // Handle composed codes if used

            if (queryCodes.length === 0) return null;

            // Find all matching zones
            const zones = await GeoZone.find({
                code: { $in: queryCodes },
                isActive: true
            }).lean();

            if (!zones || zones.length === 0) return null;

            // Priority Logic: More specific levels win
            // Order: DISTRICT > STATE > REGION > COUNTRY > CONTINENT
            const levelPriority = {
                'DISTRICT': 5,
                'UT': 4,
                'STATE': 4,
                'REGION': 3,
                'ZONE': 3,
                'COUNTRY': 2,
                'CONTINENT': 1,
                'WORLD': 0
            };

            // Sort by priority (descending)
            zones.sort((a, b) => (levelPriority[b.level] || 0) - (levelPriority[a.level] || 0));

            const bestZone = zones[0];
            console.log(`✅ Found Macro Zone: ${bestZone.name} (${bestZone.level})`);
            return bestZone;

        } catch (error) {
            console.error("Error resolving macro zone:", error);
            return null;
        }
    }

    /**
     * Quick context builder
     */
    async buildContextFromRequest(req) {
        const user = req.user || null;

        // 1. Explicit Pincode Request?
        const explicitPincode = this.extractPincode(req, user);

        // 2. Build Location Data
        let locationData = {};

        if (explicitPincode) {
            locationData = { pincode: explicitPincode };
        } else {
            // IP Detection
            locationData = await this.getLocationFromIP(req);

            // If user has default address, prioritize that pincode over IP pincode?
            // Usually explicit/user profile wins.
            if (user?.defaultAddress?.pincode) {
                locationData.pincode = user.defaultAddress.pincode;
            }
        }

        return await this.buildUserContext(user, locationData);
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
