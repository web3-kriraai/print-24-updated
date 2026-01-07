import PriceBook from "../../models/PriceBook.js";
import PriceBookEntry from "../../models/PriceBookEntry.js";
import SegmentPriceBook from "../../models/SegmentPricebook.js";
import ProductAvailability from "../../models/ProductAvailability.js";
import GeoZoneMapping from "../../models/GeoZonMapping.js";

/**
 * =========================================================================
 * PRICING RESOLVER
 * =========================================================================
 * 
 * This resolver handles BASE pricing logic ONLY.
 * 
 * Responsibilities:
 * 1. Get base price from PriceBook
 * 2. Resolve GeoZone from pincode
 * 3. Check product availability
 * 4. Return CONTEXT ONLY (no calculations)
 * 
 * STRICT RULES:
 * - Products never store prices
 * - All prices come from PriceBookEntry
 * - NO modifier calculations (ModifierEngine handles ALL modifiers)
 * - NO quantity multiplication (PricingService handles orchestration)
 * - Returns base price + context only
 */

class PricingResolver {
    /**
     * Get Base Price from PriceBook
     */
    async getBasePrice(productId, userSegmentId) {
        try {
            const segmentPriceBook = await SegmentPriceBook.findOne({
                userSegment: userSegmentId,
            })
                .populate("priceBook")
                .lean();

            let priceBookId = null;

            if (segmentPriceBook?.priceBook?._id) {
                priceBookId = segmentPriceBook.priceBook._id;
            } else {
                const defaultPriceBook = await PriceBook.findOne({ isDefault: true }).lean();
                if (!defaultPriceBook) {
                    throw new Error("No default price book found. Please configure pricing.");
                }
                priceBookId = defaultPriceBook._id;
            }

            const priceEntry = await PriceBookEntry.findOne({
                priceBook: priceBookId,
                product: productId,
            }).lean();

            if (!priceEntry || !priceEntry.basePrice) {
                throw new Error(
                    `No price configured for this product (PriceBook: ${priceBookId}).`
                );
            }

            return {
                basePrice: priceEntry.basePrice,
                compareAtPrice: priceEntry.compareAtPrice || null,
                priceBookId: priceBookId,
                priceEntryId: priceEntry._id,
            };
        } catch (error) {
            throw new Error(`Failed to get base price: ${error.message}`);
        }
    }

    /**
     * Resolve GeoZone from Pincode
     */
    async getGeoZoneByPincode(pincode) {
        if (!pincode) return null;

        const pincodeNum = parseInt(pincode);
        if (isNaN(pincodeNum)) return null;

        const mapping = await GeoZoneMapping.findOne({
            pincodeStart: { $lte: pincodeNum },
            pincodeEnd: { $gte: pincodeNum },
        })
            .populate("geoZone")
            .lean();

        return mapping?.geoZone || null;
    }

    /**
     * Check Product Availability
     */
    async checkProductAvailability(productId, geoZoneId) {
        if (!geoZoneId) return true;

        const availability = await ProductAvailability.findOne({
            product: productId,
            geoZone: geoZoneId,
        }).lean();

        if (!availability) return true;

        if (!availability.isSellable) {
            throw new Error(
                availability.reason || "This product is not available in your area."
            );
        }

        return true;
    }

    /**
     * ========================================
     * MAIN METHOD: Resolve Pricing Context
     * ========================================
     * 
     * REFINEMENT 3: Returns ONLY context, NO calculations
     * 
     * PricingService will handle:
     * - Quantity multiplication
     * - Modifier application
     * - GST calculation
     * - Final total
     */
    async resolvePrice({
        productId,
        userSegmentId,
        pincode,
        selectedAttributes = [],
    }) {
        try {
            // Step 1: Get base price
            const { basePrice, compareAtPrice, priceBookId } = await this.getBasePrice(
                productId,
                userSegmentId
            );

            // Step 2: Resolve GeoZone
            const geoZone = await this.getGeoZoneByPincode(pincode);
            const geoZoneId = geoZone?._id || null;

            // Step 3: Check product availability
            await this.checkProductAvailability(productId, geoZoneId);

            // Step 4: Return CONTEXT ONLY (REFINEMENT 3)
            return {
                basePrice,              // Unit price from PriceBook
                unitPrice: basePrice,   // Same as basePrice (for clarity)
                compareAtPrice,
                geoZoneId,
                geoZone,
                currency: geoZone?.currency || "INR",
                priceBookId,
                selectedAttributes,     // Pass through for ModifierEngine
            };
        } catch (error) {
            throw new Error(`Pricing resolution failed: ${error.message}`);
        }
    }
}

export default new PricingResolver();
