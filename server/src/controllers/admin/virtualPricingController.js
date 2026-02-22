import VirtualPriceBookService from '../../services/VirtualPriceBookService.js';
import SmartViewPriceUpdater from '../../services/SmartViewPriceUpdater.js';
import PriceBook from '../../models/PriceBook.js';
import PriceBookEntry from '../../models/PriceBookEntry.js';

const virtualPriceBookService = new VirtualPriceBookService();
const smartViewPriceUpdater = new SmartViewPriceUpdater();

/**
 * Get Smart View Matrix data
 * GET /api/admin/pricing/smart-view
 */
export const getSmartView = async (req, res) => {
  try {
    const { zone, segment, product, page = 1, limit = 50 } = req.query;

    const filters = {
      zone: zone || null,
      segment: segment || null,
      product: product || null,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    };

    const viewData = await virtualPriceBookService.getSmartView(filters);

    res.json({
      success: true,
      data: viewData
    });
  } catch (error) {
    console.error('Error getting smart view:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Calculate virtual price for specific context
 * POST /api/admin/pricing/virtual-price
 */
export const calculateVirtualPrice = async (req, res) => {
  try {
    const { productId, zoneId, segmentId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    const virtualPrice = await virtualPriceBookService.calculateVirtualPrice(
      productId,
      zoneId,
      segmentId
    );

    res.json({
      success: true,
      data: virtualPrice
    });
  } catch (error) {
    console.error('Error calculating virtual price:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Detect conflicts when setting a price
 * POST /api/admin/pricing/detect-conflicts
 */
export const detectConflicts = async (req, res) => {
  try {
    let { zoneId, segmentId, productId, newPrice } = req.body;

    // Clean up IDs to prevent CastErrors for empty strings
    if (zoneId === "") zoneId = null;
    if (segmentId === "") segmentId = null;

    if (!productId || newPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'productId and newPrice are required'
      });
    }

    const conflicts = await virtualPriceBookService.detectConflicts(
      zoneId,
      segmentId,
      productId,
      newPrice
    );

    res.json({
      success: true,
      data: conflicts
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Apply conflict resolution
 * POST /api/admin/pricing/resolve-conflict
 */
export const resolveConflict = async (req, res) => {
  try {
    let { resolutionId, conflicts, newPrice, zoneId, segmentId, productId } = req.body;

    // Clean up IDs
    if (zoneId === "") zoneId = null;
    if (segmentId === "") segmentId = null;

    if (!resolutionId || !productId || newPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'resolutionId, productId, and newPrice are required'
      });
    }

    const result = await virtualPriceBookService.applyResolution(
      resolutionId,
      conflicts,
      newPrice,
      zoneId,
      segmentId,
      productId
    );

    res.json({
      success: true,
      data: result,
      message: 'Conflict resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create master price book
 * POST /api/admin/pricing/master-book
 */
export const createMasterBook = async (req, res) => {
  try {
    const { name, description, currency } = req.body;

    // Check if master book already exists
    const existingMaster = await PriceBook.getMasterBook();
    if (existingMaster) {
      return res.status(400).json({
        success: false,
        error: 'Master price book already exists'
      });
    }

    const masterBook = await PriceBook.create({
      name: name || 'Master Price Book',
      description: description || 'Master price book containing base prices for all products',
      currency: currency || 'INR',
      isMaster: true,
      isDefault: true,
      isActive: true
    });

    res.json({
      success: true,
      data: masterBook,
      message: 'Master price book created successfully'
    });
  } catch (error) {
    console.error('Error creating master book:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create zone-specific price book
 * POST /api/admin/pricing/zone-book
 */
export const createZoneBook = async (req, res) => {
  try {
    const { name, description, zoneId, currency } = req.body;

    if (!zoneId) {
      return res.status(400).json({
        success: false,
        error: 'zoneId is required'
      });
    }

    const masterBook = await PriceBook.getMasterBook();
    if (!masterBook) {
      return res.status(400).json({
        success: false,
        error: 'Master price book must exist before creating zone books'
      });
    }

    const zoneBook = await PriceBook.create({
      name: name || `Zone Price Book`,
      description: description || `Zone-specific price overrides`,
      currency: currency || 'INR',
      zone: zoneId,
      parentBook: masterBook._id,
      isMaster: false,
      isActive: true
    });

    res.json({
      success: true,
      data: zoneBook,
      message: 'Zone price book created successfully'
    });
  } catch (error) {
    console.error('Error creating zone book:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create segment-specific price book
 * POST /api/admin/pricing/segment-book
 */
export const createSegmentBook = async (req, res) => {
  try {
    const { name, description, segmentId, zoneId, currency } = req.body;

    if (!segmentId) {
      return res.status(400).json({
        success: false,
        error: 'segmentId is required'
      });
    }

    const masterBook = await PriceBook.getMasterBook();
    if (!masterBook) {
      return res.status(400).json({
        success: false,
        error: 'Master price book must exist before creating segment books'
      });
    }

    const segmentBook = await PriceBook.create({
      name: name || `Segment Price Book`,
      description: description || `Segment-specific price overrides`,
      currency: currency || 'INR',
      segment: segmentId,
      zone: zoneId || null,
      parentBook: masterBook._id,
      isMaster: false,
      isActive: true
    });

    res.json({
      success: true,
      data: segmentBook,
      message: 'Segment price book created successfully'
    });
  } catch (error) {
    console.error('Error creating segment book:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all price books with hierarchy
 * GET /api/admin/pricing/price-books-hierarchy
 */
export const getPriceBookHierarchy = async (req, res) => {
  try {
    const masterBook = await PriceBook.getMasterBook();

    if (!masterBook) {
      return res.json({
        success: true,
        data: {
          master: null,
          children: []
        }
      });
    }

    const childBooks = await PriceBook.find({
      parentBook: masterBook._id,
      isActive: true
    }).populate('zone segment').lean();

    res.json({
      success: true,
      data: {
        master: masterBook,
        children: childBooks
      }
    });
  } catch (error) {
    console.error('Error getting price book hierarchy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

//================================
// SMART VIEW PRICE UPDATE ROUTES
//================================

/**
 * Update prices from Smart View Matrix
 * POST /api/admin/pricing/smart-view/update
 * 
 * Handles all 3 cases:
 * 1. Zone + All Segments → Update zone prices
 * 2. All Zones + Segment → Update segment prices
 * 3. Zone + Segment + Product → Update single price
 */
export const updatePricesFromSmartView = async (req, res) => {
  try {
    let { filters, priceUpdates, resolutionStrategy } = req.body;

    // Validate required fields
    if (!priceUpdates || !Array.isArray(priceUpdates) || priceUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'priceUpdates array is required and must not be empty'
      });
    }

    // Clean up filter IDs
    if (filters) {
      if (filters.zoneId === "") filters.zoneId = null;
      if (filters.segmentId === "") filters.segmentId = null;
      if (filters.productId === "") filters.productId = null;
    } else {
      filters = { zoneId: null, segmentId: null, productId: null };
    }

    // Default resolution strategy
    resolutionStrategy = resolutionStrategy || 'ASK';

    const result = await smartViewPriceUpdater.updateFromSmartView(
      filters,
      priceUpdates,
      resolutionStrategy
    );

    // If conflicts need resolution, return them without applying changes
    if (result.requiresResolution) {
      return res.json({
        success: true,
        requiresResolution: true,
        data: {
          conflictsDetected: result.conflictsDetected,
          conflicts: result.conflicts,
          impactSummary: result.impactSummary,
          affectedItems: result.affectedItems,
          resolutionOptions: result.resolutionOptions || [
            { id: 'OVERWRITE', label: 'Force Overwrite', description: 'Delete all child overrides' },
            { id: 'PRESERVE', label: 'Preserve Child Overrides', description: 'Keep existing child prices' },
            { id: 'RELATIVE', label: 'Apply Relative Adjustment', description: 'Update child prices proportionally' }
          ]
        },
        message: 'Conflicts detected. Please choose a resolution strategy.'
      });
    }

    res.json({
      success: true,
      data: result,
      message: `Successfully updated ${result.updatedCount} price(s)`
    });
  } catch (error) {
    console.error('Error updating prices from Smart View:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Bulk update multiple prices at once
 * POST /api/admin/pricing/smart-view/bulk-update
 */
export const bulkUpdatePrices = async (req, res) => {
  try {
    let { filters, priceUpdates, resolutionStrategy } = req.body;

    if (!priceUpdates || !Array.isArray(priceUpdates)) {
      return res.status(400).json({
        success: false,
        error: 'priceUpdates array is required'
      });
    }

    // Validate each update has productId and newPrice
    for (const update of priceUpdates) {
      if (!update.productId || update.newPrice === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Each update must have productId and newPrice'
        });
      }
    }

    // Clean up filter IDs
    if (filters) {
      if (filters.zoneId === "") filters.zoneId = null;
      if (filters.segmentId === "") filters.segmentId = null;
    } else {
      filters = { zoneId: null, segmentId: null };
    }

    resolutionStrategy = resolutionStrategy || 'PRESERVE';

    const result = await smartViewPriceUpdater.updateFromSmartView(
      filters,
      priceUpdates,
      resolutionStrategy
    );

    res.json({
      success: true,
      data: result,
      message: `Bulk update complete: ${result.updatedCount} updated, ${result.skippedCount || 0} skipped`
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Preview conflicts before applying bulk updates
 * POST /api/admin/pricing/smart-view/preview-conflicts
 */
export const previewBulkConflicts = async (req, res) => {
  try {
    let { filters, priceUpdates } = req.body;

    if (!priceUpdates || !Array.isArray(priceUpdates)) {
      return res.status(400).json({
        success: false,
        error: 'priceUpdates array is required'
      });
    }

    // Clean up filter IDs
    if (filters) {
      if (filters.zoneId === "") filters.zoneId = null;
      if (filters.segmentId === "") filters.segmentId = null;
    } else {
      filters = { zoneId: null, segmentId: null };
    }

    const conflicts = await smartViewPriceUpdater.previewConflicts(filters, priceUpdates);

    res.json({
      success: true,
      data: conflicts
    });
  } catch (error) {
    console.error('Error previewing conflicts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
