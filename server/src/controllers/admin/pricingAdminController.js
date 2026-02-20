import PriceBook from "../../models/PriceBook.js";
import PriceBookEntry from "../../models/PriceBookEntry.js";
import PriceModifier from "../../models/PriceModifier.js";
import GeoZone from "../../models/GeoZon.js";
import UserSegment from "../../models/UserSegment.js";
import AttributeType from "../../models/attributeTypeModal.js";
import Product from "../../models/productModal.js";
import PricingService from "../../services/pricing/PricingService.js";

/**
 * =========================================================================
 * ADMIN PRICING CONTROLLER
 * =========================================================================
 * 
 * This controller provides CRUD operations for:
 * - Price Books
 * - Price Book Entries
 * - Price Modifiers
 * - Lookup data (zones, segments, attributes)
 */

//================================
// PRICE BOOK ROUTES
//================================

export const getPriceBooks = async (req, res) => {
    try {
        const priceBooks = await PriceBook.find()
            .populate('zone', 'name')
            .populate('segment', 'name')
            .sort({ isDefault: -1, createdAt: -1 });
        res.json({ success: true, priceBooks });
    } catch (error) {
        console.error('Get price books error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPriceBook = async (req, res) => {
    try {
        const {
            name,
            currency,
            isDefault,
            zone,
            segment,
            isMaster,
            parentBook,
            isOverride,
            overridePriority,
            description,
            isVirtual,
            calculationLogic
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Price book name is required' });
        }

        // ⚠️ IMPORTANT: Only ONE Master book can exist
        // If setting as master, unset all other master books
        if (isMaster) {
            const existingMaster = await PriceBook.findOne({ isMaster: true });
            if (existingMaster) {
                console.log(`⚠️ Unmarking previous master: ${existingMaster.name}`);
                await PriceBook.updateMany({}, { isMaster: false });
            }
        } else {
            // Check if this is the FIRST book ever created
            const count = await PriceBook.countDocuments();
            if (count === 0) {
                console.log('🌟 First price book created - auto-setting as Master');
                isMaster = true;
            }
        }

        // If setting as default, unset others (legacy - no longer used in UI)
        if (isDefault) {
            await PriceBook.updateMany({}, { isDefault: false });
        }

        const priceBookData = {
            name,
            currency: currency || 'INR',
            isDefault: isDefault || false,
            zone: zone && zone !== "" ? zone : null,
            segment: segment && segment !== "" ? segment : null,
            isMaster: isMaster || false,
            parentBook: parentBook && parentBook !== "" ? parentBook : null,
            isOverride: isOverride || false,
            overridePriority: overridePriority || 0,
            description: description || "",
            isVirtual: isVirtual || false,
            calculationLogic: calculationLogic || "MASTER_ONLY"
        };

        const priceBook = await PriceBook.create(priceBookData);

        console.log(`✅ Created price book: ${priceBook.name} (Master: ${priceBook.isMaster})`);

        res.json({ success: true, priceBook });
    } catch (error) {
        console.error('Create price book error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePriceBook = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            currency,
            isDefault,
            zone,
            segment,
            isMaster,
            parentBook,
            isOverride,
            overridePriority,
            description,
            isVirtual,
            calculationLogic,
            isActive
        } = req.body;

        // ⚠️ IMPORTANT: Only ONE Master book can exist
        // If setting as master, unset all OTHER master books
        if (isMaster) {
            await PriceBook.updateMany({ _id: { $ne: id } }, { isMaster: false });
        }

        // If setting as default, unset others (legacy)
        if (isDefault) {
            await PriceBook.updateMany({ _id: { $ne: id } }, { isDefault: false });
        }

        const updateData = {
            name,
            currency,
            isDefault,
            zone: zone && zone !== "" ? zone : (zone === "" ? null : undefined),
            segment: segment && segment !== "" ? segment : (segment === "" ? null : undefined),
            isMaster,
            parentBook: parentBook && parentBook !== "" ? parentBook : (parentBook === "" ? null : undefined),
            isOverride,
            overridePriority,
            description,
            isVirtual,
            calculationLogic,
            isActive
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const priceBook = await PriceBook.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!priceBook) {
            return res.status(404).json({ success: false, message: 'Price book not found' });
        }

        console.log(`✅ Updated price book: ${priceBook.name} (Master: ${priceBook.isMaster})`);

        res.json({ success: true, priceBook });
    } catch (error) {
        console.error('Update price book error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePriceBook = async (req, res) => {
    try {
        const { id } = req.params;

        const priceBook = await PriceBook.findById(id);
        if (!priceBook) {
            return res.status(404).json({ success: false, message: 'Price book not found' });
        }

        // ⚠️ Prevent deletion of Master book
        if (priceBook.isMaster) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete Master price book. Create a new Master first, then delete this one.'
            });
        }

        // REMOVED LEGACY isDefault CHECK
        // We now allow deleting "default" books as long as they are NOT Master books.

        // Delete all entries associated with this price book
        await PriceBookEntry.deleteMany({ priceBook: id });
        await PriceBook.findByIdAndDelete(id);

        console.log(`🗑️ Deleted price book: ${priceBook.name}`);

        res.json({ success: true, message: 'Price book deleted' });
    } catch (error) {
        console.error('Delete price book error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Copy a price book with all its entries
 * POST /api/admin/price-books/:id/copy
 */
export const copyPriceBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Name for the copied price book is required'
            });
        }

        // Find the source price book
        const sourcePriceBook = await PriceBook.findById(id);
        if (!sourcePriceBook) {
            return res.status(404).json({ success: false, message: 'Source price book not found' });
        }

        // Create the new price book (copy all fields except _id, isMaster, isDefault)
        const newPriceBookData = {
            name: name.trim(),
            currency: sourcePriceBook.currency,
            zone: sourcePriceBook.zone,
            segment: sourcePriceBook.segment,
            parentBook: sourcePriceBook.parentBook,
            isOverride: sourcePriceBook.isOverride,
            overridePriority: sourcePriceBook.overridePriority,
            description: `Copied from: ${sourcePriceBook.name}`,
            isVirtual: sourcePriceBook.isVirtual,
            calculationLogic: sourcePriceBook.calculationLogic,
            isActive: true,
            isMaster: false, // Never copy as master
            isDefault: false // Never copy as default
        };

        const newPriceBook = await PriceBook.create(newPriceBookData);

        // Copy all entries from the source price book
        const sourceEntries = await PriceBookEntry.find({ priceBook: id });
        let entriesCopied = 0;

        for (const entry of sourceEntries) {
            await PriceBookEntry.create({
                priceBook: newPriceBook._id,
                product: entry.product,
                basePrice: entry.basePrice,
                compareAtPrice: entry.compareAtPrice,
                isActive: entry.isActive
            });
            entriesCopied++;
        }

        console.log(`📋 Copied price book: ${sourcePriceBook.name} → ${newPriceBook.name} (${entriesCopied} entries)`);

        // Populate and return the new price book
        await newPriceBook.populate('zone', 'name');
        await newPriceBook.populate('segment', 'name');

        res.json({
            success: true,
            priceBook: newPriceBook,
            entriesCopied,
            message: `Successfully copied ${entriesCopied} product prices`
        });
    } catch (error) {
        console.error('Copy price book error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// PRICE BOOK ENTRY ROUTES
//================================

export const getPriceBookEntries = async (req, res) => {
    try {
        const { priceBook } = req.query;

        if (!priceBook) {
            return res.status(400).json({ success: false, message: 'priceBook query parameter required' });
        }

        const entries = await PriceBookEntry.find({ priceBook })
            .populate('product', 'name image category')
            .sort({ createdAt: -1 });

        // Filter out entries where product has been deleted (null)
        const validEntries = entries.filter(entry => entry.product !== null);

        // Clean up orphaned entries (optional - removes them from DB)
        const orphanedEntries = entries.filter(entry => entry.product === null);
        if (orphanedEntries.length > 0) {
            const orphanedIds = orphanedEntries.map(e => e._id);
            await PriceBookEntry.deleteMany({ _id: { $in: orphanedIds } });
            console.log(`Cleaned up ${orphanedEntries.length} orphaned price book entries`);
        }

        res.json({ success: true, entries: validEntries });
    } catch (error) {
        console.error('Get price book entries error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPriceBookEntry = async (req, res) => {
    try {
        const { priceBook, product, basePrice, compareAtPrice } = req.body;

        if (!priceBook || !product || basePrice === undefined) {
            return res.status(400).json({
                success: false,
                message: 'priceBook, product, and basePrice are required'
            });
        }

        // Check if entry already exists
        const existing = await PriceBookEntry.findOne({ priceBook, product });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Price entry already exists for this product in this price book'
            });
        }

        const entry = await PriceBookEntry.create({
            priceBook,
            product,
            basePrice: parseFloat(basePrice),
            compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        });

        await entry.populate('product', 'name image');

        // Invalidate cache for this product
        await PricingService.invalidateCache({ productId: product });

        res.json({ success: true, entry });
    } catch (error) {
        console.error('Create price book entry error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePriceBookEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { basePrice, compareAtPrice } = req.body;

        const entry = await PriceBookEntry.findByIdAndUpdate(
            id,
            {
                basePrice: parseFloat(basePrice),
                compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
            },
            { new: true }
        ).populate('product', 'name image');

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Price entry not found' });
        }

        // Invalidate pricing cache for this product
        await PricingService.invalidateCache({ productId: entry.product._id });

        res.json({ success: true, entry });
    } catch (error) {
        console.error('Update price book entry error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePriceBookEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const entry = await PriceBookEntry.findById(id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Price entry not found' });
        }

        await PriceBookEntry.findByIdAndDelete(id);

        // Invalidate cache
        await PricingService.invalidateCache({ productId: entry.product });

        res.json({ success: true, message: 'Price entry deleted' });
    } catch (error) {
        console.error('Delete price book entry error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// PRICE MODIFIER ROUTES
//================================

export const getPriceModifiers = async (req, res) => {
    try {
        const modifiers = await PriceModifier.find()
            .populate('geoZone', 'name currency')
            .populate('userSegment', 'name code')
            .populate('product', 'name image')
            .populate('attributeType', 'attributeName')
            .sort({ priority: -1, createdAt: -1 });

        res.json({ success: true, modifiers });
    } catch (error) {
        console.error('Get price modifiers error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPriceModifier = async (req, res) => {
    try {
        const modifierData = {
            appliesTo: req.body.appliesTo,
            modifierType: req.body.modifierType,
            value: parseFloat(req.body.value),
            priority: parseInt(req.body.priority) || 0,
            isActive: req.body.isActive !== false,
            isStackable: req.body.isStackable !== false,
            reason: req.body.reason || '',
        };

        // Add optional fields based on scope
        if (req.body.geoZone) modifierData.geoZone = req.body.geoZone;
        if (req.body.userSegment) modifierData.userSegment = req.body.userSegment;
        if (req.body.product) modifierData.product = req.body.product;
        if (req.body.attributeType) modifierData.attributeType = req.body.attributeType;
        if (req.body.attributeValue) modifierData.attributeValue = req.body.attributeValue;
        if (req.body.minQuantity) modifierData.minQuantity = parseInt(req.body.minQuantity);
        if (req.body.maxQuantity) modifierData.maxQuantity = parseInt(req.body.maxQuantity);
        if (req.body.validFrom) modifierData.validFrom = new Date(req.body.validFrom);
        if (req.body.validTo) modifierData.validTo = new Date(req.body.validTo);

        const modifier = await PriceModifier.create(modifierData);

        await modifier.populate('geoZone userSegment product attributeType');

        // Invalidate cache
        await PricingService.invalidateCache({
            productId: modifier.product,
            userSegmentId: modifier.userSegment,
            geoZoneId: modifier.geoZone,
        });

        res.json({ success: true, modifier });
    } catch (error) {
        console.error('Create price modifier error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePriceModifier = async (req, res) => {
    try {
        const { id } = req.params;

        const updateData = {
            ...req.body,
            value: req.body.value ? parseFloat(req.body.value) : undefined,
            priority: req.body.priority !== undefined ? parseInt(req.body.priority) : undefined,
            minQuantity: req.body.minQuantity ? parseInt(req.body.minQuantity) : undefined,
            maxQuantity: req.body.maxQuantity ? parseInt(req.body.maxQuantity) : undefined,
            validFrom: req.body.validFrom ? new Date(req.body.validFrom) : undefined,
            validTo: req.body.validTo ? new Date(req.body.validTo) : undefined,
        };

        const modifier = await PriceModifier.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('geoZone userSegment product attributeType');

        if (!modifier) {
            return res.status(404).json({ success: false, message: 'Price modifier not found' });
        }

        // Invalidate cache
        await PricingService.invalidateCache({
            productId: modifier.product,
            userSegmentId: modifier.userSegment,
            geoZoneId: modifier.geoZone,
        });

        res.json({ success: true, modifier });
    } catch (error) {
        console.error('Update price modifier error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePriceModifier = async (req, res) => {
    try {
        const { id } = req.params;

        const modifier = await PriceModifier.findById(id);
        if (!modifier) {
            return res.status(404).json({ success: false, message: 'Price modifier not found' });
        }

        await PriceModifier.findByIdAndDelete(id);

        // Invalidate cache
        await PricingService.invalidateCache({
            productId: modifier.product,
            userSegmentId: modifier.userSegment,
            geoZoneId: modifier.geoZone,
        });

        res.json({ success: true, message: 'Price modifier deleted' });
    } catch (error) {
        console.error('Delete price modifier error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// LOOKUP ROUTES (for dropdowns)
//================================

export const getGeoZones = async (req, res) => {
    try {
        const GeoZoneMapping = (await import('../../models/GeoZonMapping.js')).default;

        const zones = await GeoZone.find().sort({ name: 1 });

        // Fetch pincode ranges for each zone from GeoZonMapping
        const zonesWithRanges = await Promise.all(zones.map(async (zone) => {
            const mappings = await GeoZoneMapping.find({ geoZone: zone._id }).sort({ pincodeStart: 1 });

            return {
                ...zone.toObject(),
                pincodeRanges: mappings.map(m => ({
                    start: m.pincodeStart,
                    end: m.pincodeEnd
                }))
            };
        }));

        res.json({ success: true, zones: zonesWithRanges });
    } catch (error) {
        console.error('Get geo zones error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserSegments = async (req, res) => {
    try {
        const segments = await UserSegment.find().sort({ name: 1 }).populate('signupForm', 'name code');
        res.json({ success: true, segments });
    } catch (error) {
        console.error('Get user segments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAttributeTypes = async (req, res) => {
    try {
        const attributeTypes = await AttributeType.find()
            .select('attributeName pricingBehavior attributeValues')
            .sort({ attributeName: 1 });
        res.json({ success: true, attributeTypes });
    } catch (error) {
        console.error('Get attribute types error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .select('name image category')
            .populate('category', 'name')
            .sort({ name: 1 });
        res.json({ success: true, products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Categories (for Rule Builder dropdown)
export const getCategories = async (req, res) => {
    try {
        const Category = (await import('../../models/categoryModal.js')).default;
        const categories = await Category.find()
            .select('name slug')
            .sort({ name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// PRICING AUDIT LOGS
//================================

export const getAllPricingLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            startDate,
            endDate,
        } = req.query;

        // Import the model
        const PricingCalculationLog = (await import('../../models/PricingCalculationLogschema.js')).default;
        const Order = (await import('../../models/orderModal.js')).default;

        // Build query
        const query = {};

        // Date filter
        if (startDate || endDate) {
            query.appliedAt = {};
            if (startDate) query.appliedAt.$gte = new Date(startDate);
            if (endDate) query.appliedAt.$lte = new Date(endDate);
        }

        // Get logs with populated data
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await PricingCalculationLog.find(query)
            .populate({
                path: 'order',
                select: 'orderNumber product user quantity totalPrice createdAt',
                populate: [
                    { path: 'product', select: 'name image' },
                    { path: 'user', select: 'name email' }
                ]
            })
            .populate('modifier', 'reason appliesTo modifierType value')
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Filter by search if provided (after population)
        let filteredLogs = logs;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredLogs = logs.filter(log => {
                if (!log.order) return false;
                const orderNumber = log.order.orderNumber?.toLowerCase() || '';
                const productName = log.order.product?.name?.toLowerCase() || '';
                const userName = log.order.user?.name?.toLowerCase() || '';
                const userEmail = log.order.user?.email?.toLowerCase() || '';

                return orderNumber.includes(searchLower) ||
                    productName.includes(searchLower) ||
                    userName.includes(searchLower) ||
                    userEmail.includes(searchLower);
            });
        }

        // Get total count for pagination
        const totalLogs = await PricingCalculationLog.countDocuments(query);

        // Group logs by order for better presentation
        const groupedLogs = {};
        filteredLogs.forEach(log => {
            if (!log.order) return;

            const orderId = log.order._id.toString();
            if (!groupedLogs[orderId]) {
                groupedLogs[orderId] = {
                    orderId,
                    orderNumber: log.order.orderNumber,
                    product: log.order.product,
                    user: log.order.user,
                    quantity: log.order.quantity,
                    totalPrice: log.order.totalPrice,
                    createdAt: log.order.createdAt,
                    modifiers: []
                };
            }

            groupedLogs[orderId].modifiers.push({
                _id: log._id,
                pricingKey: log.pricingKey,
                scope: log.scope,
                beforeAmount: log.beforeAmount,
                afterAmount: log.afterAmount,
                reason: log.reason,
                modifier: log.modifier,
                appliedAt: log.appliedAt
            });
        });

        const logsArray = Object.values(groupedLogs);

        res.json({
            success: true,
            logs: logsArray,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalLogs / parseInt(limit)),
                totalLogs,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get pricing logs error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

