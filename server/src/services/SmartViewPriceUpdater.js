import PriceBook from '../models/PriceBook.js';
import PriceBookEntry from '../models/PriceBookEntry.js';
import Product from '../models/productModal.js';
import GeoZone from '../models/GeoZon.js';
import UserSegment from '../models/UserSegment.js';
import VirtualPriceBookService from './VirtualPriceBookService.js';
import { PricingCache } from '../config/redis.js';

/**
 * Smart View Price Updater Service
 * 
 * Handles bulk price updates from Smart View Matrix with conflict detection.
 * 
 * 3 Use Cases:
 * 1. Zone + All Segments → Update zone base price for all products
 * 2. All Zones + Segment → Update segment price for all products
 * 3. Zone + Segment + Product → Update single atomic price point
 */
class SmartViewPriceUpdater {
  constructor() {
    this.virtualPriceBookService = new VirtualPriceBookService();
  }

  /**
   * Main entry point for Smart View updates
   * Determines update type based on filter combination
   */
  async updateFromSmartView(filters, priceUpdates, resolutionStrategy = 'ASK') {
    const { zoneId, segmentId, productId } = filters;

    // Check if price updates have individual segment/zone IDs (batch cell editing)
    const hasIndividualCellUpdates = priceUpdates.some(u => u.segmentId || u.zoneId);

    if (hasIndividualCellUpdates) {
      // Process each update individually using its own segment/zone context
      return await this.updateIndividualCells(priceUpdates, resolutionStrategy);
    }

    // Case 3: Single price point (most specific)
    if (zoneId && segmentId && productId) {
      const update = priceUpdates.find(u => u.productId === productId) || priceUpdates[0];
      return await this.updateSinglePrice(zoneId, segmentId, productId, update.newPrice, resolutionStrategy);
    }

    // Case 1: Zone-specific (all segments)
    if (zoneId && !segmentId) {
      return await this.updateZonePrices(zoneId, priceUpdates, resolutionStrategy);
    }

    // Case 2: Segment-specific (all zones)
    if (segmentId && !zoneId) {
      return await this.updateSegmentPrices(segmentId, priceUpdates, resolutionStrategy);
    }

    // Case: Zone + Segment (no specific product) - bulk update all products for zone+segment
    if (zoneId && segmentId && !productId) {
      return await this.updateZoneSegmentPrices(zoneId, segmentId, priceUpdates, resolutionStrategy);
    }

    // Default: Master book update (all zones, all segments)
    return await this.updateMasterPrices(priceUpdates, resolutionStrategy);
  }

  /**
   * Process individual cell updates - each update has its own zone/segment context
   * This is used when user edits multiple cells in the matrix and saves all at once
   * 
   * @param {Array} priceUpdates - Array of price updates, each with:
   *   - productId: The product to update
   *   - newPrice: The new price
   *   - zoneId: The zone context
   *   - segmentId: The segment context (null if applyToAllSegments is true)
   *   - applyToAllSegments: If true, update zone-only book (affects all segments)
   */
  async updateIndividualCells(priceUpdates, resolutionStrategy) {
    const results = {
      success: true,
      updatedCount: 0,
      skippedCount: 0,
      conflictsDetected: 0,
      conflicts: [],
      updates: [],
      requiresResolution: false
    };

    for (const update of priceUpdates) {
      const { productId, newPrice, zoneId, segmentId, applyToAllSegments } = update;

      // If applyToAllSegments is true, set segmentId to null so it updates the zone book
      const effectiveSegmentId = applyToAllSegments ? null : (segmentId || null);

      console.log(`[updateIndividualCells] Product: ${productId}, Zone: ${zoneId}, Segment: ${effectiveSegmentId}, ApplyToAll: ${applyToAllSegments}`);

      // Each cell update goes to its specific zone+segment price book (or zone-only if applyToAllSegments)
      const cellResult = await this.updateSinglePrice(
        zoneId || null,
        effectiveSegmentId,
        productId,
        newPrice,
        resolutionStrategy
      );

      if (cellResult.requiresResolution) {
        results.requiresResolution = true;
        results.conflictsDetected += cellResult.conflictsDetected || 0;
        results.conflicts.push(...(cellResult.conflicts || []));
        results.resolutionOptions = cellResult.resolutionOptions;
        results.skippedCount++;
      } else {
        results.updatedCount += cellResult.updatedCount || 0;
        results.updates.push({
          productId,
          newPrice,
          zoneId,
          segmentId: effectiveSegmentId,
          applyToAllSegments
        });
      }
    }

    return results;
  }

  /**
   * Case 1: Update prices for a specific zone (applies to all segments)
   */
  async updateZonePrices(zoneId, priceUpdates, resolutionStrategy) {
    const results = {
      success: true,
      updatedCount: 0,
      skippedCount: 0,
      conflictsDetected: 0,
      conflicts: [],
      updates: [],
      requiresResolution: false
    };

    // Get or create zone-specific price book
    let zoneBook = await PriceBook.findOne({
      zone: zoneId,
      segment: null,
      isActive: true
    });

    if (!zoneBook) {
      // Create zone book if it doesn't exist
      const masterBook = await PriceBook.getMasterBook();
      if (!masterBook) {
        throw new Error('Master price book must exist before creating zone prices');
      }

      const zone = await GeoZone.findById(zoneId);
      zoneBook = await PriceBook.create({
        name: `Zone Price Book - ${zone?.name || 'Unknown'}`,
        description: `Zone-specific price overrides for ${zone?.name}`,
        currency: zone?.currency_code || 'INR',
        zone: zoneId,
        segment: null,
        parentBook: masterBook._id,
        isMaster: false,
        isOverride: true,
        isActive: true
      });
    }

    // Process each price update
    for (const update of priceUpdates) {
      const { productId, newPrice } = update;

      // Check for conflicts (child overrides at segment level)
      const conflicts = await this.detectChildConflicts(zoneId, null, productId, newPrice);

      if (conflicts.hasConflicts) {
        results.conflictsDetected++;
        results.conflicts.push({
          productId,
          newPrice,
          existingOverrides: conflicts.conflicts
        });

        if (resolutionStrategy === 'ASK') {
          results.requiresResolution = true;
          results.skippedCount++;
          continue;
        }

        // Apply resolution strategy
        await this.virtualPriceBookService.applyResolution(
          resolutionStrategy,
          conflicts.conflicts,
          newPrice,
          zoneId,
          null,
          productId
        );
      }

      // Create or update price entry
      await PriceBookEntry.findOneAndUpdate(
        { priceBook: zoneBook._id, product: productId },
        { basePrice: newPrice },
        { upsert: true, new: true }
      );

      results.updatedCount++;
      results.updates.push({ productId, newPrice, priceBookId: zoneBook._id });
    }

    // Invalidate cache for this zone
    await PricingCache.invalidateZone(zoneId);

    return results;
  }

  /**
   * Case 2: Update prices for a specific segment (applies to all zones)
   */
  async updateSegmentPrices(segmentId, priceUpdates, resolutionStrategy) {
    const results = {
      success: true,
      updatedCount: 0,
      skippedCount: 0,
      conflictsDetected: 0,
      conflicts: [],
      updates: [],
      requiresResolution: false
    };

    // Get or create segment-specific price book
    let segmentBook = await PriceBook.findOne({
      zone: null,
      segment: segmentId,
      isActive: true
    });

    if (!segmentBook) {
      const masterBook = await PriceBook.getMasterBook();
      if (!masterBook) {
        throw new Error('Master price book must exist before creating segment prices');
      }

      const segment = await UserSegment.findById(segmentId);
      segmentBook = await PriceBook.create({
        name: `Segment Price Book - ${segment?.name || 'Unknown'}`,
        description: `Segment-specific price overrides for ${segment?.name}`,
        currency: 'INR',
        zone: null,
        segment: segmentId,
        parentBook: masterBook._id,
        isMaster: false,
        isOverride: true,
        isActive: true
      });
    }

    // Process each price update
    for (const update of priceUpdates) {
      const { productId, newPrice } = update;

      // Check for conflicts (zone+segment combinations)
      const conflicts = await this.detectChildConflicts(null, segmentId, productId, newPrice);

      if (conflicts.hasConflicts) {
        results.conflictsDetected++;
        results.conflicts.push({
          productId,
          newPrice,
          existingOverrides: conflicts.conflicts
        });

        if (resolutionStrategy === 'ASK') {
          results.requiresResolution = true;
          results.skippedCount++;
          continue;
        }

        await this.virtualPriceBookService.applyResolution(
          resolutionStrategy,
          conflicts.conflicts,
          newPrice,
          null,
          segmentId,
          productId
        );
      }

      await PriceBookEntry.findOneAndUpdate(
        { priceBook: segmentBook._id, product: productId },
        { basePrice: newPrice },
        { upsert: true, new: true }
      );

      results.updatedCount++;
      results.updates.push({ productId, newPrice, priceBookId: segmentBook._id });
    }

    // Invalidate cache for this segment
    await PricingCache.invalidateSegment(segmentId);

    return results;
  }

  /**
   * Case 3: Update single price point (most specific)
   */
  async updateSinglePrice(zoneId, segmentId, productId, newPrice, resolutionStrategy) {
    console.log('[SmartViewPriceUpdater] updateSinglePrice called with:', {
      zoneId,
      segmentId,
      productId,
      newPrice,
      resolutionStrategy
    });

    const results = {
      success: true,
      updatedCount: 0,
      conflictsDetected: 0,
      conflicts: [],
      requiresResolution: false
    };

    // Check for conflicts first
    const conflicts = await this.virtualPriceBookService.detectConflicts(
      zoneId,
      segmentId,
      productId,
      newPrice
    );

    if (conflicts.hasConflicts) {
      console.log('[SmartViewPriceUpdater] Conflicts detected:', conflicts);
      results.conflictsDetected = conflicts.conflicts.length;
      results.conflicts = conflicts.conflicts;

      if (resolutionStrategy === 'ASK') {
        results.requiresResolution = true;
        results.resolutionOptions = conflicts.resolutionOptions;
        return results;
      }

      // Apply the chosen resolution
      await this.virtualPriceBookService.applyResolution(
        resolutionStrategy,
        conflicts.conflicts,
        newPrice,
        zoneId,
        segmentId,
        productId
      );
    } else {
      // No conflicts - direct update
      // IMPORTANT: Find or create a price book for the EXACT zone+segment combination
      // Do NOT fall back to a less specific book (zone-only or segment-only)
      console.log('[SmartViewPriceUpdater] No conflicts, looking for exact price book match...');

      let priceBook = await PriceBook.findOne({
        zone: zoneId || null,
        segment: segmentId || null,
        isActive: true
      });

      console.log('[SmartViewPriceUpdater] Found existing price book:', priceBook ? {
        id: priceBook._id,
        name: priceBook.name,
        zone: priceBook.zone,
        segment: priceBook.segment
      } : 'NONE - will create new');

      if (!priceBook) {
        // Create a new price book for this exact zone+segment combination
        const masterBook = await PriceBook.getMasterBook();
        const zone = zoneId ? await GeoZone.findById(zoneId) : null;
        const segment = segmentId ? await UserSegment.findById(segmentId) : null;

        const bookName = [
          zone?.name || 'All Zones',
          segment?.name || 'All Segments'
        ].join(' + ') + ' Price Book';

        priceBook = await PriceBook.create({
          name: bookName,
          description: `Auto-created from Smart View for ${zone?.name || 'All Zones'} + ${segment?.name || 'All Segments'}`,
          zone: zoneId || null,
          segment: segmentId || null,
          parentBook: masterBook._id,
          isMaster: false,
          isOverride: true,
          isActive: true
        });

        console.log('[SmartViewPriceUpdater] Created NEW price book:', {
          id: priceBook._id,
          name: priceBook.name,
          zone: priceBook.zone,
          segment: priceBook.segment
        });
      }

      // Update the price entry in the specific price book
      await PriceBookEntry.findOneAndUpdate(
        { priceBook: priceBook._id, product: productId },
        { basePrice: newPrice },
        { upsert: true, new: true }
      );

      console.log('[SmartViewPriceUpdater] Updated price entry in book:', priceBook.name);
    }

    results.success = true;
    results.updatedCount = 1;

    // Invalidate cache for this product
    await PricingCache.invalidateProduct(productId);

    return results;
  }

  /**
   * Update prices for a specific Zone + Segment combination (all products)
   */
  async updateZoneSegmentPrices(zoneId, segmentId, priceUpdates, resolutionStrategy) {
    const results = {
      success: true,
      updatedCount: 0,
      skippedCount: 0,
      conflictsDetected: 0,
      conflicts: [],
      updates: [],
      requiresResolution: false
    };

    // Get or create zone+segment specific price book
    let priceBook = await PriceBook.findOne({
      zone: zoneId,
      segment: segmentId,
      isActive: true
    });

    if (!priceBook) {
      const masterBook = await PriceBook.getMasterBook();
      const zone = await GeoZone.findById(zoneId);
      const segment = await UserSegment.findById(segmentId);

      priceBook = await PriceBook.create({
        name: `Price Book - ${zone?.name} + ${segment?.name}`,
        description: `Zone+Segment specific prices`,
        zone: zoneId,
        segment: segmentId,
        parentBook: masterBook._id,
        isMaster: false,
        isOverride: true,
        isActive: true
      });
    }

    for (const update of priceUpdates) {
      const { productId, newPrice } = update;

      await PriceBookEntry.findOneAndUpdate(
        { priceBook: priceBook._id, product: productId },
        { basePrice: newPrice },
        { upsert: true, new: true }
      );

      results.updatedCount++;
      results.updates.push({ productId, newPrice, priceBookId: priceBook._id });
    }

    // Invalidate cache
    await PricingCache.invalidateZone(zoneId);
    await PricingCache.invalidateSegment(segmentId);

    return results;
  }

  /**
   * Update master book prices (affects all zones and segments)
   */
  async updateMasterPrices(priceUpdates, resolutionStrategy) {
    const results = {
      success: true,
      updatedCount: 0,
      skippedCount: 0,
      conflictsDetected: 0,
      conflicts: [],
      updates: [],
      requiresResolution: false
    };

    const masterBook = await PriceBook.getMasterBook();
    if (!masterBook) {
      throw new Error('Master price book not found');
    }

    for (const update of priceUpdates) {
      const { productId, newPrice } = update;

      // Check for any overrides at all levels
      const conflicts = await this.detectAllChildConflicts(productId, newPrice);

      if (conflicts.hasConflicts) {
        results.conflictsDetected++;
        results.conflicts.push({
          productId,
          newPrice,
          existingOverrides: conflicts.conflicts
        });

        if (resolutionStrategy === 'ASK') {
          results.requiresResolution = true;
          results.skippedCount++;
          continue;
        }

        // For OVERWRITE: delete all child overrides
        if (resolutionStrategy === 'OVERWRITE') {
          for (const conflict of conflicts.conflicts) {
            await PriceBookEntry.findOneAndDelete({
              priceBook: conflict.priceBookId,
              product: productId
            });
          }
        }
        // For RELATIVE: adjust all child prices proportionally
        else if (resolutionStrategy === 'RELATIVE') {
          const currentMasterEntry = await PriceBookEntry.findOne({
            priceBook: masterBook._id,
            product: productId
          });
          if (currentMasterEntry) {
            const ratio = newPrice / currentMasterEntry.basePrice;
            for (const conflict of conflicts.conflicts) {
              await PriceBookEntry.findOneAndUpdate(
                { priceBook: conflict.priceBookId, product: productId },
                { basePrice: Math.round(conflict.existingPrice * ratio * 100) / 100 }
              );
            }
          }
        }
        // PRESERVE: just update master, keep children as-is
      }

      await PriceBookEntry.findOneAndUpdate(
        { priceBook: masterBook._id, product: productId },
        { basePrice: newPrice },
        { upsert: true, new: true }
      );

      results.updatedCount++;
      results.updates.push({ productId, newPrice, priceBookId: masterBook._id });
    }

    // Invalidate all pricing cache
    await PricingCache.invalidateAll();

    return results;
  }

  /**
   * Detect child conflicts for a given context
   */
  async detectChildConflicts(zoneId, segmentId, productId, newPrice) {
    const conflicts = [];

    // Find all price entries for this product
    const allEntries = await PriceBookEntry.find({ product: productId })
      .populate('priceBook')
      .lean();

    for (const entry of allEntries) {
      const book = entry.priceBook;
      if (!book || !book.isActive) continue;

      // Skip if it's the same context
      const bookZone = book.zone?.toString() || null;
      const bookSegment = book.segment?.toString() || null;
      const targetZone = zoneId?.toString() || null;
      const targetSegment = segmentId?.toString() || null;

      if (bookZone === targetZone && bookSegment === targetSegment) continue;

      // Check if this is a more specific (child) context
      const isChild = this.isChildContext(targetZone, targetSegment, bookZone, bookSegment);

      if (isChild) {
        conflicts.push({
          type: bookZone && bookSegment ? 'ZONE_SEGMENT_OVERRIDE' :
            bookZone ? 'ZONE_OVERRIDE' : 'SEGMENT_OVERRIDE',
          existingPrice: entry.basePrice,
          newPrice,
          priceDifference: newPrice - entry.basePrice,
          priceBookId: book._id,
          priceBookName: book.name,
          zone: book.zone,
          segment: book.segment
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Detect ALL child conflicts for master price update
   */
  async detectAllChildConflicts(productId, newPrice) {
    const conflicts = [];
    const masterBook = await PriceBook.getMasterBook();

    const allEntries = await PriceBookEntry.find({ product: productId })
      .populate('priceBook')
      .lean();

    for (const entry of allEntries) {
      const book = entry.priceBook;
      if (!book || !book.isActive) continue;
      if (book._id.toString() === masterBook?._id?.toString()) continue;

      conflicts.push({
        type: book.zone && book.segment ? 'ZONE_SEGMENT_OVERRIDE' :
          book.zone ? 'ZONE_OVERRIDE' : 'SEGMENT_OVERRIDE',
        existingPrice: entry.basePrice,
        newPrice,
        priceBookId: book._id,
        priceBookName: book.name,
        zone: book.zone,
        segment: book.segment
      });
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Check if (bookZone, bookSegment) is a child/more-specific context of (targetZone, targetSegment)
   */
  isChildContext(targetZone, targetSegment, bookZone, bookSegment) {
    // Target = Zone only, Book = Zone + Segment → Book is child
    if (targetZone && !targetSegment && bookZone === targetZone && bookSegment) {
      return true;
    }

    // Target = Segment only, Book = Zone + Segment → Book is child
    if (!targetZone && targetSegment && bookSegment === targetSegment && bookZone) {
      return true;
    }

    // Target = Master (null, null), Book = anything → Book is child
    if (!targetZone && !targetSegment && (bookZone || bookSegment)) {
      return true;
    }

    return false;
  }

  /**
   * Preview conflicts without making changes
   */
  async previewConflicts(filters, priceUpdates) {
    const { zoneId, segmentId } = filters;
    const allConflicts = [];

    for (const update of priceUpdates) {
      const { productId, newPrice } = update;

      let conflicts;
      if (!zoneId && !segmentId) {
        conflicts = await this.detectAllChildConflicts(productId, newPrice);
      } else {
        conflicts = await this.detectChildConflicts(zoneId, segmentId, productId, newPrice);
      }

      if (conflicts.hasConflicts) {
        allConflicts.push({
          productId,
          newPrice,
          conflicts: conflicts.conflicts
        });
      }
    }

    return {
      hasConflicts: allConflicts.length > 0,
      totalConflicts: allConflicts.reduce((sum, c) => sum + c.conflicts.length, 0),
      conflictsByProduct: allConflicts,
      resolutionOptions: [
        {
          id: 'OVERWRITE',
          label: 'Force Overwrite',
          description: 'Delete all child overrides and apply new prices globally'
        },
        {
          id: 'PRESERVE',
          label: 'Preserve Child Overrides',
          description: 'Set new prices but keep existing child-specific prices'
        },
        {
          id: 'RELATIVE',
          label: 'Apply Relative Adjustment',
          description: 'Update child prices proportionally'
        }
      ]
    };
  }
}

export default SmartViewPriceUpdater;
