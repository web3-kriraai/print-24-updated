import UserContextService from "../services/UserContextService.js";

/**
 * =========================================================================
 * OPTIONAL AUTH MIDDLEWARE
 * =========================================================================
 * 
 * Similar to authMiddleware, but doesn't require authentication.
 * - If token is present and valid, attaches user to req.user
 * - If no token or invalid token, continues without user (guest mode)
 * 
 * This is useful for pricing endpoints where we want to:
 * - Show personalized prices for logged-in users
 * - Show default prices for guest users
 */
export const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // If no auth header, continue as guest
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            req.user = null;
            return next();
        }

        // Try to verify token
        const jwt = (await import("jsonwebtoken")).default;
        const { User } = await import("../models/User.js");

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded && decoded.id) {
                const user = await User.findById(decoded.id)
                    .populate("userSegment")
                    .select("-password");

                if (user) {
                    req.user = user;
                }
            }
        } catch (tokenError) {
            // Invalid token - continue as guest
            console.log("Invalid token in optional auth, continuing as guest");
            req.user = null;
        }

        next();
    } catch (err) {
        console.error("Optional auth middleware error:", err);
        // On any error, continue as guest
        req.user = null;
        next();
    }
};

/**
 * =========================================================================
 * PRICING CONTEXT MIDDLEWARE
 * =========================================================================
 * 
 * Attaches pricing context to req.pricingContext
 * 
 * Works with both authenticated and guest users.
 * Priority for pincode resolution:
 * 1. Request body/query (user explicitly specified)
 * 2. User's default address (from profile)
 * 3. User's territory access (first pincode)
 * 4. IP-based detection (future enhancement)
 * 
 * Usage:
 * router.post('/quote', optionalAuthMiddleware, pricingContextMiddleware, getPriceQuote);
 */
export const pricingContextMiddleware = async (req, res, next) => {
    try {
        // Build pricing context from user and request data
        const context = await UserContextService.buildContextFromRequest(req);

        // Attach to request
        req.pricingContext = context;

        // Enhanced logging for debugging
        console.log('\n' + '='.repeat(80));
        console.log('🎯 PRICING CONTEXT BUILT');
        console.log('='.repeat(80));
        
        if (req.user) {
            console.log('👤 USER INFO:');
            console.log(`   ID: ${req.user._id}`);
            console.log(`   Name: ${req.user.name || req.user.firstName + ' ' + req.user.lastName}`);
            console.log(`   Email: ${req.user.email}`);
            console.log(`   Type: ${req.user.userType || 'customer'}`);
            console.log(`   Role: ${req.user.role}`);
        } else {
            console.log('👥 GUEST USER (Not logged in)');
        }
        
        console.log('\n📊 SEGMENT INFO:');
        console.log(`   Segment Code: ${context.userSegmentCode || 'N/A'}`);
        console.log(`   Segment Name: ${context.userSegmentName || 'N/A'}`);
        console.log(`   Pricing Tier: ${context.pricingTier || 0}`);
        
        console.log('\n📍 LOCATION INFO:');
        console.log(`   Pincode: ${context.pincode || 'Not detected'}`);
        console.log(`   Geo Zone: ${context.geoZoneName || 'Not mapped'}`);
        console.log(`   Territory Access: ${context.territoryAccess?.join(', ') || 'None'}`);
        
        console.log('\n🔐 AUTH STATUS:');
        console.log(`   Authenticated: ${context.isAuthenticated ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   User Type: ${context.userType}`);
        
        console.log('='.repeat(80) + '\n');

        next();
    } catch (err) {
        console.error("Pricing context middleware error:", err);
        
        // Fallback to minimal context
        req.pricingContext = {
            userSegmentCode: "RETAIL",
            userType: "guest",
            isAuthenticated: false,
        };
        
        next();
    }
};
