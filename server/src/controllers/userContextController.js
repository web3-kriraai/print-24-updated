import UserContextService from "../services/UserContextService.js";

/**
 * =========================================================================
 * USER CONTEXT CONTROLLER
 * =========================================================================
 * 
 * Endpoints for fetching user context information including:
 * - User details (ID, name, email, type)
 * - User segment (for pricing)
 * - Location (IP-based or explicit pincode)
 * - Geo zone mapping
 * - All data needed for pricing engine
 */

/**
 * GET /api/user/context
 * 
 * Fetch complete user context for pricing
 * 
 * Auth: Optional (works for both guests and logged-in users)
 * 
 * Response:
 * {
 *   user: { id, name, email, type, role },
 *   segment: { code, name, tier },
 *   location: { pincode, geoZone, detectionMethod },
 *   pricing: { currency, territoryAccess }
 * }
 */
export const getUserContext = async (req, res) => {
    try {
        // Build complete pricing context
        const context = await UserContextService.buildContextFromRequest(req);

        // Format response with all necessary information
        const response = {
            success: true,
            user: {
                id: context.userId,
                name: req.user?.name || req.user?.firstName + ' ' + req.user?.lastName || 'Guest',
                email: req.user?.email || null,
                mobileNumber: req.user?.mobileNumber || null,
                userType: context.userType,
                role: req.user?.role || 'guest',
                isAuthenticated: context.isAuthenticated,
                isGuest: !context.isAuthenticated
            },
            segment: {
                id: context.userSegmentId,
                code: context.userSegmentCode,
                name: context.userSegmentName,
                pricingTier: context.pricingTier
            },
            location: {
                pincode: context.pincode,
                geoZone: {
                    id: context.geoZoneId,
                    name: context.geoZoneName
                },
                // Full hierarchy: [most-specific → least-specific]
                geoZoneHierarchy: (context.geoZoneHierarchy || []).map(z => ({
                    id: z._id,
                    name: z.name,
                    level: z.level,
                })),
                territoryAccess: context.territoryAccess,
                // Accurate detection method from the service
                detectionMethod: context.detectionMethod || (
                    (req.body?.pincode || req.query?.pincode)
                        ? 'REQUEST'
                        : (req.user?.defaultAddress?.pincode || req.user?.territoryAccess?.length)
                            ? 'USER_PROFILE'
                            : 'IP_DETECTION'
                ),
            },
            pricing: {
                currency: 'INR',
                creditLimit: context.creditLimit,
                paymentTerms: context.paymentTerms
            },
            meta: {
                timestamp: new Date().toISOString(),
                source: 'USER_CONTEXT_API'
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Get user context error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user context',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * POST /api/user/update-location
 * 
 * Update user's location preference
 * Stores pincode in session/profile for future pricing calls
 * 
 * Body: { pincode: "560001", lat?: number, lng?: number }
 */
export const updateUserLocation = async (req, res) => {
    try {
        const { pincode, lat, lng } = req.body;

        // Validate pincode
        if (!pincode || !/^\d{6}$/.test(pincode)) {
            return res.status(400).json({
                success: false,
                message: 'Valid 6-digit pincode is required'
            });
        }

        // Resolve geo zone for this pincode
        const geoZone = await UserContextService.resolveGeoZone(pincode);

        if (!geoZone) {
            return res.status(400).json({
                success: false,
                message: 'Pincode not serviced. Please contact support.',
                pincode
            });
        }

        // If user is logged in, update their profile (optional enhancement)
        if (req.user) {
            // TODO: Save to user.defaultAddress.pincode
            console.log(`📍 User ${req.user._id} updated location to ${pincode}`);
        }

        // Store in session for immediate use
        if (req.session) {
            req.session.pincode = pincode;
            if (lat && lng) {
                req.session.location = { lat, lng };
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            location: {
                pincode,
                geoZone: {
                    id: geoZone._id,
                    name: geoZone.name
                },
                coordinates: lat && lng ? { lat, lng } : null
            }
        });

    } catch (error) {
        console.error('Update location error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update location',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
