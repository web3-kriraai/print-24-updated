import PriceBook from '../models/PriceBook.js';
import PriceBookEntry from '../models/PriceBookEntry.js';
import PriceModifier from '../models/PriceModifier.js';
import ProductAvailability from '../models/ProductAvailability.js';
import Product from '../models/productModal.js';
import GeoZone from '../models/GeoZon.js';
import UserSegment from '../models/UserSegment.js';
import JSONRuleEvaluator from './JSONRuleEvaluator.js';

/**
 * Virtual Price Book Service
 * 
 * Implements hierarchical pricing: Master → Zone Adjustments → Segment Adjustments → Modifiers
 * 
 * Features:
 * - Calculate virtual prices using hierarchy
 * - Apply PriceModifier rules (zone, segment, product modifiers)
 * - Check product availability in zones
 * - Smart View Matrix (4 view types)
 * - Conflict detection
 * - Resolution options (Overwrite, Preserve, Relative)
 */

class VirtualPriceBookService {
  constructor() {
    this.jsonRuleEvaluator = new JSONRuleEvaluator();
  }

  /**
   * Calculate virtual price using hierarchy
   * Master + Zone + Segment + Modifiers = Final Price
   * 
   * @param {string} productId 
   * @param {string} zoneId 
   * @param {string} segmentId 
   * @param {Object} contextOverride - Optional context data (e.g. product object)
   * @returns {Object} Price breakdown with sources
   */
  async calculateVirtualPrice(productId, zoneId, segmentId, contextOverride = {}) {
    try {
      console.log('\n' + '═'.repeat(80));
      console.log(`🔹 CALCULATING VIRTUAL PRICE`);
      console.log(`   Product: ${productId}`);
      console.log(`   Zone: ${zoneId || 'None'}`);
      console.log(`   Segment: ${segmentId || 'None'}`);
      console.log('═'.repeat(80));

      // 0. Check product availability in zone
      if (zoneId) {
        const availability = await this.checkProductAvailability(productId, zoneId);
        if (!availability.isAvailable) {
          console.log(`❌ Product NOT AVAILABLE in zone ${zoneId}: ${availability.reason}`);
          return {
            productId,
            zoneId,
            segmentId,
            isAvailable: false,
            availabilityReason: availability.reason,
            masterPrice: null,
            finalPrice: null,
            adjustments: [],
            modifiersApplied: 0,
            isVirtual: true,
            calculationTimestamp: new Date()
          };
        }
      }

      // 1. Get master price (base price)
      const masterPrice = await this.getMasterPrice(productId);

      if (!masterPrice) {
        throw new Error(`No master price found for product ${productId}`);
      }

      console.log(`\n💰 STEP 1: Master Price = ₹${masterPrice.basePrice}`);
      console.log(`   from: ${masterPrice.bookName}`);

      // 2. Get zone adjustments using HIERARCHICAL fallback (if hierarchy provided)
      let zoneAdjustments = null;
      const geoZoneHierarchy = contextOverride.geoZoneHierarchy || [];

      if (geoZoneHierarchy.length > 0) {
        // Use hierarchical lookup
        zoneAdjustments = await this.getZoneAdjustmentsHierarchical(productId, geoZoneHierarchy);
      } else if (zoneId) {
        // Fallback: single zone lookup (backward compatibility)
        zoneAdjustments = await this.getZoneAdjustments(productId, zoneId);
      }

      // 3. Get segment adjustments (if any)
      const segmentAdjustments = segmentId ? await this.getSegmentAdjustments(productId, zoneId, segmentId) : null;

      // Construct Context for Rule Evaluation
      const context = {
        productId,
        geoZoneId: zoneId,
        userSegmentId: segmentId,
        basePrice: masterPrice.basePrice,
        ...contextOverride
      };

      // If product object is not in context but needed, we might want to fetch it
      // But for performance, we rely on contextOverride or minimal ID matching for now.
      // If a rule uses "Category", we need the product.
      if (!context.product && !context.categoryId && !context.category) {
        // Optimization: Only fetch if we suspect we need it? 
        // For now, let's fast-fetch lean product if not provided, 
        // because Combination Rules OFTEN use Category/SubCategory.
        try {
          const productData = await Product.findById(productId).select('category subCategory type sku attributes').lean();
          if (productData) {
            context.categoryId = productData.category;
            context.subCategoryId = productData.subCategory;
            context.productType = productData.type;
            context.sku = productData.sku;
            context.productAttributes = productData.attributes || []; // Added for attribute-based pricing
          }
        } catch (e) {
          console.warn('Failed to fetch product details for context', e);
        }
      }

      // 4. Get PriceModifiers (zone, segment, product, AND COMBINATION)
      const modifiers = await this.getApplicableModifiers(productId, zoneId, segmentId, context);

      // 5. Apply hierarchy: Master + Zone + Segment + Modifiers
      let finalPrice = masterPrice.basePrice;
      const adjustments = [];

      // Apply zone adjustments from PriceBook
      if (zoneAdjustments) {
        const beforeZone = finalPrice;
        finalPrice = this.applyAdjustment(finalPrice, zoneAdjustments);
        console.log(`\n💰 STEP 2: Zone Price Override`);
        console.log(`   Before: ₹${beforeZone}`);
        console.log(`   Override: ₹${zoneAdjustments.adjustment} (${zoneAdjustments.adjustmentType})`);
        console.log(`   After: ₹${finalPrice}`);
        console.log(`   from: ${zoneAdjustments.priceBookName}`);

        adjustments.push({
          type: 'ZONE_BOOK',
          value: zoneAdjustments.adjustment,
          adjustmentType: zoneAdjustments.adjustmentType,
          book: zoneAdjustments.priceBookId,
          bookName: zoneAdjustments.priceBookName,
          beforePrice: beforeZone,
          afterPrice: finalPrice
        });
      } else {
        console.log(`\n⏭️  STEP 2: No zone-specific price override`);
      }

      // Apply segment adjustments from PriceBook
      if (segmentAdjustments) {
        const beforeSegment = finalPrice;
        finalPrice = this.applyAdjustment(finalPrice, segmentAdjustments);
        console.log(`\n💰 STEP 3: Segment Price Override`);
        console.log(`   Before: ₹${beforeSegment}`);
        console.log(`   Override: ₹${segmentAdjustments.adjustment} (${segmentAdjustments.adjustmentType})`);
        console.log(`   After: ₹${finalPrice}`);
        console.log(`   from: ${segmentAdjustments.priceBookName}`);

        adjustments.push({
          type: 'SEGMENT_BOOK',
          value: segmentAdjustments.adjustment,
          adjustmentType: segmentAdjustments.adjustmentType,
          book: segmentAdjustments.priceBookId,
          bookName: segmentAdjustments.priceBookName,
          beforePrice: beforeSegment,
          afterPrice: finalPrice
        });
      } else {
        console.log(`\n⏭️  STEP 3: No segment-specific price override`);
      }

      console.log(`\n🎯 STEP 4: Applying Price Modifiers`);
      console.log(`   Base Price (after zone/segment): ₹${finalPrice}`);
      console.log(`   Modifiers found: ${modifiers.length}`);

      // Apply PriceModifier rules with stackability support
      // Group modifiers by stackability and category
      const stackableModifiers = modifiers.filter(m => m.isStackable !== false);
      const nonStackableModifiers = modifiers.filter(m => m.isStackable === false);

      console.log(`   - Stackable: ${stackableModifiers.length}`);
      console.log(`   - Non-stackable: ${nonStackableModifiers.length}`);

      // For non-stackable modifiers, we need to pick the best one from each category
      // Category = appliesTo (ZONE, SEGMENT, PRODUCT, GLOBAL, COMBINATION)
      const nonStackableByCategory = {};

      for (const modifier of nonStackableModifiers) {
        const category = modifier.appliesTo;
        if (!nonStackableByCategory[category]) {
          nonStackableByCategory[category] = [];
        }
        nonStackableByCategory[category].push(modifier);
      }

      // For each category, pick the best modifier
      const bestNonStackable = [];
      for (const category in nonStackableByCategory) {
        const categoryModifiers = nonStackableByCategory[category];

        // Pick the best: highest for increases, lowest for decreases
        let best = categoryModifiers[0];
        for (const modifier of categoryModifiers) {
          if (modifier.modifierType.includes('INC')) {
            // For increases, pick the highest
            if (modifier.value > best.value) best = modifier;
          } else if (modifier.modifierType.includes('DEC')) {
            // For decreases, pick the highest discount (biggest value)
            if (modifier.value > best.value) best = modifier;
          }
        }
        bestNonStackable.push(best);
      }

      // Combine stackable and best non-stackable, sort by priority
      const modifiersToApply = [...stackableModifiers, ...bestNonStackable]
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));

      console.log(`   → Applying ${modifiersToApply.length} modifiers...`);

      // Apply all selected modifiers
      for (const modifier of modifiersToApply) {
        const beforePrice = finalPrice;
        finalPrice = this.applyModifier(finalPrice, modifier);
        const change = finalPrice - beforePrice;

        console.log(`   ${change >= 0 ? '📈' : '📉'} ${modifier.name}: ${modifier.modifierType} ${modifier.value}`);
        console.log(`      Before: ₹${beforePrice.toFixed(2)} → After: ₹${finalPrice.toFixed(2)} (${change >= 0 ? '+' : ''}₹${change.toFixed(2)})`);

        adjustments.push({
          type: 'MODIFIER',
          modifierId: modifier._id,
          modifierName: modifier.name,
          modifierType: modifier.modifierType,
          value: modifier.value,
          appliesTo: modifier.appliesTo,
          isStackable: modifier.isStackable !== false,
          beforePrice,
          afterPrice: finalPrice,
          change: finalPrice - beforePrice
        });
      }

      // Round the final price to 2 decimal places
      finalPrice = this.roundPrice(finalPrice);

      console.log(`\n✅ FINAL PRICE: ₹${finalPrice.toFixed(2)}`);
      console.log('═'.repeat(80) + '\n');

      return {
        productId,
        zoneId,
        segmentId,
        isAvailable: true,
        masterPrice: masterPrice.basePrice,
        masterBook: masterPrice.bookId,
        masterBookName: masterPrice.bookName,
        finalPrice,
        adjustments,
        modifiersApplied: modifiers.length,
        isVirtual: true,
        calculationTimestamp: new Date(),
        // NEW: Zone hierarchy metadata
        usedZoneId: zoneAdjustments?.usedZoneId || zoneId,
        usedZoneName: zoneAdjustments?.usedZoneName || null,
        usedZoneLevel: zoneAdjustments?.usedZoneLevel || null,
        geoZoneHierarchy: geoZoneHierarchy
      };
    } catch (error) {
      console.error('Error calculating virtual price:', error);
      throw error;
    }
  }

  /**
   * Helper to round price to 2 decimal places
   */
  roundPrice(price) {
    return Math.round((price + Number.EPSILON) * 100) / 100;
  }

  /**
   * Get applicable PriceModifiers for the given context
   */
  async getApplicableModifiers(productId, zoneId, segmentId, context) {
    const modifiers = [];

    // Get zone-specific modifiers
    if (zoneId) {
      const zoneModifiers = await PriceModifier.find({
        appliesTo: 'ZONE',
        geoZone: zoneId,
        isActive: true
      }).sort({ priority: 1 }).lean();
      modifiers.push(...zoneModifiers);
    }

    // Get segment-specific modifiers
    if (segmentId) {
      const segmentModifiers = await PriceModifier.find({
        appliesTo: 'SEGMENT',
        userSegment: segmentId,
        isActive: true
      }).sort({ priority: 1 }).lean();
      modifiers.push(...segmentModifiers);
    }

    // Get product-specific modifiers
    if (productId) {
      const productModifiers = await PriceModifier.find({
        appliesTo: 'PRODUCT',
        product: productId,
        isActive: true
      }).sort({ priority: 1 }).lean();
      modifiers.push(...productModifiers);
    }

    // Get CATEGORY-specific modifiers (if product has category in context)
    if (context?.categoryId || context?.category) {
      const categoryId = context.categoryId || context.category?._id || context.category;
      const categoryModifiers = await PriceModifier.find({
        appliesTo: 'CATEGORY',
        category: categoryId,
        isActive: true
      }).sort({ priority: 1 }).lean();
      modifiers.push(...categoryModifiers);
    }

    // Get ATTRIBUTE-specific modifiers (match by attribute type and value)
    if (context?.productAttributes && Array.isArray(context.productAttributes)) {
      for (const attr of context.productAttributes) {
        const attributeModifiers = await PriceModifier.find({
          appliesTo: 'ATTRIBUTE',
          attributeType: attr.type || attr.attributeType,
          attributeValue: attr.value || attr.attributeValue,
          isActive: true
        }).sort({ priority: 1 }).lean();
        modifiers.push(...attributeModifiers);
      }
    }

    // Get global modifiers
    const globalModifiers = await PriceModifier.find({
      appliesTo: 'GLOBAL',
      isActive: true
    }).sort({ priority: 1 }).lean();
    modifiers.push(...globalModifiers);

    // Get COMBINATION modifiers and evaluate them
    const combinationModifiers = await PriceModifier.find({
      appliesTo: 'COMBINATION',
      isActive: true
    }).sort({ priority: 1 }).lean();

    for (const modifier of combinationModifiers) {
      // Validate modifier validity (isValid method logic might need to be replicated or we instantiate the model)
      // Since we are using lean(), we don't have methods.
      // We'll trust the query 'isActive: true' and maybe check date manually if needed. 
      // For now, let's assume active modifiers are generally valid time-wise or checked elsewhere. 
      // Actually PriceModifier.isValid also checks dates. We should replicate that or use non-lean?
      // Let's rely on JSON evaluator for the conditions.

      if (this.jsonRuleEvaluator.evaluate(modifier.conditions, context)) {
        modifiers.push(modifier);
      }
    }

    // Sort all modifiers by priority
    return modifiers.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * Check if product is available in the given zone
   */
  async checkProductAvailability(productId, zoneId) {
    try {
      const restriction = await ProductAvailability.findOne({
        product: productId,
        geoZone: zoneId,
        isActive: true
      }).lean();

      if (restriction && restriction.isSellable === false) {
        return {
          isAvailable: false,
          reason: restriction.reason || 'Product not available in this zone'
        };
      }

      return { isAvailable: true };
    } catch (error) {
      console.error('Error checking product availability:', error);
      return { isAvailable: true }; // Default to available on error
    }
  }

  /**
   * Apply a single PriceModifier to a price
   */
  applyModifier(price, modifier) {
    const { modifierType, value } = modifier;

    switch (modifierType) {
      case 'PERCENT_INC':
        return price * (1 + value / 100);
      case 'PERCENT_DEC':
        return price * (1 - value / 100);
      case 'FLAT_INC':
        return price + value;
      case 'FLAT_DEC':
        return price - value;
      default:
        return price;
    }
  }


  /**
   * Get master price for product
   */
  async getMasterPrice(productId) {
    const masterBook = await PriceBook.getMasterBook();

    if (!masterBook) {
      throw new Error('No master price book found');
    }

    const entry = await PriceBookEntry.findOne({
      priceBook: masterBook._id,
      product: productId
    }).lean();

    if (!entry) {
      return null;
    }

    return {
      basePrice: entry.basePrice,
      compareAtPrice: entry.compareAtPrice,
      bookId: masterBook._id,
      bookName: masterBook.name
    };
  }

  /**
   * Get zone-specific adjustments using HIERARCHICAL fallback
   * Tries each zone in hierarchy (most specific first) until price found
   * 
   * @param {string} productId 
   * @param {Array} geoZoneHierarchy - Array of zone objects in priority order
   * @returns {Object|null} Zone adjustments with metadata about which zone was used
   */
  async getZoneAdjustmentsHierarchical(productId, geoZoneHierarchy) {
    try {
      if (!geoZoneHierarchy || geoZoneHierarchy.length === 0) {
        return null;
      }

      console.log(`\n🔍 Searching for zone-specific pricing (hierarchical)...`);

      // Try each zone in hierarchy (most specific first)
      for (const zone of geoZoneHierarchy) {
        try {
          const adjustments = await this.getZoneAdjustments(productId, zone._id);
          if (adjustments) {
            console.log(`   ✅ Found price in: ${zone.name} (${zone.level})`);
            // Add metadata about which zone was used
            return {
              ...adjustments,
              usedZone: zone,
              usedZoneId: zone._id,
              usedZoneName: zone.name,
              usedZoneLevel: zone.level
            };
          } else {
            console.log(`   ⏭️  No price in: ${zone.name} (${zone.level})`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Error checking zone ${zone.name}:`, error.message);
          // Continue to next zone
        }
      }

      console.log(`   ℹ️  No zone-specific pricing found in hierarchy`);
      return null;
    } catch (error) {
      console.error('Error in hierarchical zone lookup:', error);
      return null;
    }
  }

  /**
   * Get zone-specific adjustments
   */
  async getZoneAdjustments(productId, zoneId) {
    const zoneBook = await PriceBook.findOne({
      zone: zoneId,
      segment: null,
      isActive: true
    }).lean();

    if (!zoneBook) return null;

    const entry = await PriceBookEntry.findOne({
      priceBook: zoneBook._id,
      product: productId
    }).lean();

    if (!entry) return null;

    return {
      adjustment: entry.basePrice,
      adjustmentType: 'ABSOLUTE', // Could be ABSOLUTE or RELATIVE
      priceBookId: zoneBook._id,
      priceBookName: zoneBook.name
    };
  }

  /**
   * Get segment-specific adjustments
   */
  async getSegmentAdjustments(productId, zoneId, segmentId) {
    // Try zone + segment combination first
    let segmentBook = await PriceBook.findOne({
      zone: zoneId,
      segment: segmentId,
      isActive: true
    }).lean();

    // Fall back to segment-only
    if (!segmentBook) {
      segmentBook = await PriceBook.findOne({
        zone: null,
        segment: segmentId,
        isActive: true
      }).lean();
    }

    if (!segmentBook) return null;

    const entry = await PriceBookEntry.findOne({
      priceBook: segmentBook._id,
      product: productId
    }).lean();

    if (!entry) return null;

    return {
      adjustment: entry.basePrice,
      adjustmentType: 'ABSOLUTE',
      priceBookId: segmentBook._id,
      priceBookName: segmentBook.name
    };
  }

  /**
   * Apply adjustment to price
   */
  applyAdjustment(basePrice, adjustment) {
    if (adjustment.adjustmentType === 'ABSOLUTE') {
      return adjustment.adjustment;
    } else if (adjustment.adjustmentType === 'RELATIVE') {
      return basePrice + adjustment.adjustment;
    } else if (adjustment.adjustmentType === 'PERCENTAGE') {
      return basePrice * (1 + adjustment.adjustment / 100);
    }
    return basePrice;
  }

  /**
   * Get Smart View Matrix data
   * 4 view types based on filter selection
   * 
   * @param {Object} filters {zone, segment, product}
   * @returns {Object} Matrix view based on selection
   */
  async getSmartView(filters) {
    const { zone, segment, product } = filters;

    // Determine view type based on filters
    if (zone && segment && product) {
      return await this.getSingleCellView(zone, segment, product);
    } else if (zone && segment) {
      return await this.getGroupZoneView(zone, segment);
    } else if (zone && product) {
      return await this.getProductZoneView(zone, product);
    } else if (zone) {
      return await this.getZoneView(zone);
    } else {
      return await this.getMasterView();
    }
  }

  /**
   * Single Cell View: Deep dive into one price point
   */
  async getSingleCellView(zoneId, segmentId, productId) {
    const product = await Product.findById(productId).lean();
    const zone = await GeoZone.findById(zoneId).lean();
    const segment = await UserSegment.findById(segmentId).lean();

    const price = await this.calculateVirtualPrice(productId, zoneId, segmentId, { product });

    return {
      viewType: 'SINGLE_CELL',
      zoneId,
      segmentId,
      productId,
      zoneName: zone?.name,
      segmentName: segment?.name,
      productName: product?.name,
      price,
      ancestors: await this.getHierarchyAncestors(zoneId, segmentId)
    };
  }

  /**
   * Group Zone View: All products for a zone + segment combination
   */
  async getGroupZoneView(zoneId, segmentId) {
    const products = await Product.find({}).lean();
    const prices = [];

    for (const product of products) {
      try {
        const price = await this.calculateVirtualPrice(product._id, zoneId, segmentId, { product });
        prices.push({
          productId: product._id,
          productName: product.name,
          ...price
        });
      } catch (error) {
        // Skip logging for "No master price" errors as they're expected
        if (!error.message?.includes('No master price found')) {
          console.error(`Error calculating price for product ${product._id}:`, error.message);
        }
      }
    }

    return {
      viewType: 'GROUP_ZONE',
      zoneId,
      segmentId,
      prices
    };
  }

  /**
   * Product Zone View: One product across all segments in a zone
   */
  async getProductZoneView(zoneId, productId) {
    const product = await Product.findById(productId).lean();
    const segments = await UserSegment.find().lean();
    const prices = [];

    for (const segment of segments) {
      try {
        const price = await this.calculateVirtualPrice(productId, zoneId, segment._id, { product });
        prices.push({
          segmentId: segment._id,
          segmentName: segment.name,
          ...price
        });
      } catch (error) {
        // Skip logging for "No master price" errors as they're expected
        if (!error.message?.includes('No master price found')) {
          console.error(`Error calculating price for segment ${segment._id}:`, error.message);
        }
      }
    }

    return {
      viewType: 'PRODUCT_ZONE',
      zoneId,
      productId,
      prices
    };
  }

  /**
   * Zone View: All products and segments in a zone
   * Shows only products that are available in the zone and have a master price
   */
  async getZoneView(zoneId) {
    const products = await Product.find({}).limit(50).lean();
    console.log(`[getZoneView] Found ${products.length} products to check`);
    const segments = await UserSegment.find().lean();
    const matrix = [];

    for (const product of products) {
      // 1. Check availability first - Skip if not available in this zone
      const availability = await this.checkProductAvailability(product._id, zoneId);
      if (!availability.isAvailable) {
        continue;
      }

      // 2. Check if product has a master price - Skip if no price set
      const masterPrice = await this.getMasterPrice(product._id);
      if (!masterPrice) {
        continue;
      }

      const row = {
        productId: product._id,
        productName: product.name,
        isAvailable: true,
        segments: {}
      };

      for (const segment of segments) {
        try {
          const price = await this.calculateVirtualPrice(product._id, zoneId, segment._id, { product });
          row.segments[segment.code] = {
            finalPrice: price.finalPrice,
            isAvailable: price.isAvailable !== false
          };
        } catch (error) {
          row.segments[segment.code] = {
            finalPrice: null,
            isAvailable: false
          };
        }
      }

      matrix.push(row);
    }

    return {
      viewType: 'ZONE',
      zoneId,
      matrix
    };
  }

  /**
   * Master View: All products with master prices
   */
  async getMasterView() {
    const masterBook = await PriceBook.getMasterBook();
    const entries = await PriceBookEntry.find({ priceBook: masterBook._id })
      .populate('product')
      .lean();

    return {
      viewType: 'MASTER',
      masterBookId: masterBook._id,
      masterBookName: masterBook.name,
      entries: entries.map(entry => ({
        productId: entry.product._id,
        productName: entry.product.name,
        basePrice: entry.basePrice,
        compareAtPrice: entry.compareAtPrice
      }))
    };
  }

  /**
   * Get hierarchy ancestors for a zone/segment combination
   */
  async getHierarchyAncestors(zoneId, segmentId) {
    const ancestors = [];

    // Get zone hierarchy
    if (zoneId) {
      const zone = await GeoZone.findById(zoneId);
      if (zone) {
        const zonePath = await zone.getAncestors();
        ancestors.push(...zonePath.map(z => ({
          type: 'ZONE',
          id: z._id,
          name: z.name,
          level: z.level
        })));
      }
    }

    // Get segment
    if (segmentId) {
      const segment = await UserSegment.findById(segmentId).lean();
      if (segment) {
        ancestors.push({
          type: 'SEGMENT',
          id: segment._id,
          name: segment.name,
          code: segment.code
        });
      }
    }

    return ancestors;
  }

  /**
   * Detect conflicts when admin tries to override price
   */
  async detectConflicts(zoneId, segmentId, productId, newPrice) {
    const conflicts = [];

    // Fetch product details for display
    const product = await Product.findById(productId)
      .select('name sku')
      .lean();

    // Check for existing overrides at different levels
    const existingOverrides = await PriceBookEntry.find({
      product: productId
    }).populate('priceBook').lean();

    // Analyze each potential conflict
    for (const override of existingOverrides) {
      const book = override.priceBook;

      if (!book) continue; // Safety check

      const existingZone = book.zone ? book.zone.toString() : null;
      const existingSegment = book.segment ? book.segment.toString() : null;

      const targetZone = zoneId ? zoneId.toString() : null;
      const targetSegment = segmentId ? segmentId.toString() : null;

      // Skip if same context
      if (existingZone === targetZone && existingSegment === targetSegment) {
        continue;
      }

      // Check if there's a conflict
      const conflict = await this.analyzeConflict(override, zoneId, segmentId, newPrice);
      if (conflict) conflicts.push(conflict);
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      product: product ? { _id: product._id, name: product.name, sku: product.sku } : null, // Added product details
      resolutionOptions: this.getResolutionOptions(conflicts)
    };
  }

  /**
   * Analyze a single conflict
   */
  async analyzeConflict(override, newZoneId, newSegmentId, newPrice) {
    const book = override.priceBook;
    if (!book) return null;

    // Determine conflict type
    let conflictType = null;

    if (book.zone && book.segment) {
      conflictType = 'ZONE_SEGMENT_OVERRIDE';
    } else if (book.zone) {
      conflictType = 'ZONE_OVERRIDE';
    } else if (book.segment) {
      conflictType = 'SEGMENT_OVERRIDE';
    }

    if (!conflictType) return null;

    return {
      type: conflictType,
      existingPrice: override.basePrice,
      newPrice,
      priceDifference: newPrice - override.basePrice,
      percentageDifference: ((newPrice - override.basePrice) / override.basePrice * 100).toFixed(2),
      priceBookId: book._id,
      priceBookName: book.name,
      zone: book.zone,
      segment: book.segment
    };
  }

  /**
   * Provide 3 resolution options (from SRS)
   */
  getResolutionOptions(conflicts) {
    return [
      {
        id: 'OVERWRITE',
        label: 'Force Overwrite',
        description: 'Delete all child overrides and apply new price globally',
        action: 'DELETE_OVERRIDES',
        impact: `Will delete ${conflicts.length} existing override(s)`
      },
      {
        id: 'PRESERVE',
        label: 'Preserve Child Overrides',
        description: 'Set new base price but keep existing child-specific prices',
        action: 'CREATE_OVERRIDE_WITH_EXCEPTIONS',
        impact: `Will create new override while preserving ${conflicts.length} existing override(s)`
      },
      {
        id: 'RELATIVE',
        label: 'Apply Relative Adjustment',
        description: 'Update child prices proportionally (e.g., if VIP was 10% cheaper, keep that ratio)',
        action: 'ADJUST_RELATIVE',
        impact: `Will adjust ${conflicts.length} override(s) proportionally`
      }
    ];
  }

  /**
   * Apply resolution to conflicts
   */
  async applyResolution(resolutionId, conflicts, newPrice, zoneId, segmentId, productId) {
    switch (resolutionId) {
      case 'OVERWRITE':
        return await this.applyOverwrite(conflicts, newPrice, zoneId, segmentId, productId);

      case 'PRESERVE':
        return await this.applyPreserve(conflicts, newPrice, zoneId, segmentId, productId);

      case 'RELATIVE':
        return await this.applyRelative(conflicts, newPrice, zoneId, segmentId, productId);

      default:
        throw new Error(`Unknown resolution ID: ${resolutionId}`);
    }
  }

  /**
   * Overwrite: Delete all conflicting overrides
   */
  async applyOverwrite(conflicts, newPrice, zoneId, segmentId, productId) {
    const deletedIds = [];

    for (const conflict of conflicts) {
      await PriceBookEntry.findOneAndDelete({
        priceBook: conflict.priceBookId,
        product: productId
      });
      deletedIds.push(conflict.priceBookId);
    }

    // Create new override
    const book = await PriceBook.getBookForContext(zoneId, segmentId);
    await PriceBookEntry.create({
      priceBook: book._id,
      product: productId,
      basePrice: newPrice
    });

    return {
      action: 'OVERWRITE',
      deletedOverrides: deletedIds.length,
      newPrice
    };
  }

  /**
   * Preserve: Keep existing overrides, create new one
   */
  async applyPreserve(conflicts, newPrice, zoneId, segmentId, productId) {
    const book = await PriceBook.getBookForContext(zoneId, segmentId);

    await PriceBookEntry.findOneAndUpdate(
      { priceBook: book._id, product: productId },
      { basePrice: newPrice },
      { upsert: true }
    );

    return {
      action: 'PRESERVE',
      preservedOverrides: conflicts.length,
      newPrice
    };
  }

  /**
   * Relative: Adjust all overrides proportionally
   */
  async applyRelative(conflicts, newPrice, zoneId, segmentId, productId) {
    const masterPrice = await this.getMasterPrice(productId);
    const priceChange = newPrice - masterPrice.basePrice;
    const changeRatio = newPrice / masterPrice.basePrice;

    const adjustedPrices = [];

    for (const conflict of conflicts) {
      const oldPrice = conflict.existingPrice;
      const newAdjustedPrice = oldPrice * changeRatio;

      await PriceBookEntry.findOneAndUpdate(
        { priceBook: conflict.priceBookId, product: productId },
        { basePrice: newAdjustedPrice }
      );

      adjustedPrices.push({
        priceBookId: conflict.priceBookId,
        oldPrice,
        newPrice: newAdjustedPrice
      });
    }

    // Update the target price
    const book = await PriceBook.getBookForContext(zoneId, segmentId);
    await PriceBookEntry.findOneAndUpdate(
      { priceBook: book._id, product: productId },
      { basePrice: newPrice },
      { upsert: true }
    );

    return {
      action: 'RELATIVE',
      adjustedOverrides: adjustedPrices.length,
      adjustedPrices,
      newPrice
    };
  }
}

export default VirtualPriceBookService;
