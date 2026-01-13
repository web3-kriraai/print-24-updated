import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as controller from '../../controllers/admin/pricingAdminController.js';
import * as crudController from '../../controllers/admin/pricingCrudController.js';
import * as virtualController from '../../controllers/admin/virtualPricingController.js';
import * as locationController from '../../controllers/admin/locationSearchController.js';
import { validateCombinationModifier, validateModifierData } from '../../middlewares/modifierValidation.js';
const router = express.Router();

/**
 * =========================================================================
 * ADMIN PRICING ROUTES
 * =========================================================================
 * 
 * All routes require admin authentication
 * 
 * Endpoints:
 * - Price Books: /price-books
 * - Price Book Entries: /price-book-entries
 * - Price Modifiers: /price-modifiers
 * - Geo Zones: /pricing/geo-zones
 * - User Segments: /pricing/user-segments
 * - Product Availability: /pricing/product-availability
 * - Lookup Data: /pricing/...
 */

// Auth middleware - all routes require admin access
router.use(authMiddleware);
router.use((req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
});

//================================
// PRICE BOOK ROUTES
//================================

router.get('/price-books', controller.getPriceBooks);
router.post('/price-books', controller.createPriceBook);
router.put('/price-books/:id', controller.updatePriceBook);
router.delete('/price-books/:id', controller.deletePriceBook);

//================================
// PRICE BOOK ENTRY ROUTES
//================================

router.get('/price-book-entries', controller.getPriceBookEntries);
router.post('/price-book-entries', controller.createPriceBookEntry);
router.put('/price-book-entries/:id', controller.updatePriceBookEntry);
router.delete('/price-book-entries/:id', controller.deletePriceBookEntry);

//================================
// PRICE MODIFIER ROUTES
//================================

router.get('/price-modifiers', controller.getPriceModifiers);
router.post('/price-modifiers', controller.createPriceModifier);
router.put('/price-modifiers/:id', controller.updatePriceModifier);
router.delete('/price-modifiers/:id', controller.deletePriceModifier);

//================================
// GEO ZONE ROUTES
//================================

router.get('/pricing/geo-zones', controller.getGeoZones);
router.post('/pricing/geo-zones', crudController.createGeoZone);
router.put('/pricing/geo-zones/:id', crudController.updateGeoZone);
router.delete('/pricing/geo-zones/:id', crudController.deleteGeoZone);
router.post('/pricing/geo-zones/bulk-import', crudController.bulkImportGeoZones);

//================================
// USER SEGMENT ROUTES
//================================

router.get('/pricing/user-segments', controller.getUserSegments);
router.post('/pricing/user-segments', crudController.createUserSegment);
router.put('/pricing/user-segments/:id', crudController.updateUserSegment);
router.delete('/pricing/user-segments/:id', crudController.deleteUserSegment);
router.post('/pricing/user-segments/:id/set-default', crudController.setDefaultUserSegment);

//================================
// PRODUCT AVAILABILITY ROUTES
//================================

router.get('/pricing/product-availability', crudController.getProductAvailability);
router.post('/pricing/product-availability', crudController.createProductAvailability);
router.put('/pricing/product-availability/:id', crudController.updateProductAvailability);
router.delete('/pricing/product-availability/:id', crudController.deleteProductAvailability);

//================================
// LOOKUP DATA ROUTES
//================================

router.get('/pricing/attribute-types', controller.getAttributeTypes);
router.get('/pricing/products', controller.getProducts);
router.get('/pricing/categories', controller.getCategories);
router.get('/pricing-logs', controller.getAllPricingLogs);


//================================
// VIRTUAL PRICING ROUTES (Day 3)
//================================

// Smart View Matrix
router.get('/pricing/smart-view', virtualController.getSmartView);

// Virtual Price Calculation
router.post('/pricing/virtual-price', virtualController.calculateVirtualPrice);

// Conflict Detection & Resolution
router.post('/pricing/detect-conflicts', virtualController.detectConflicts);
router.post('/pricing/resolve-conflict', virtualController.resolveConflict);

// Price Book Management
router.post('/pricing/master-book', virtualController.createMasterBook);
router.post('/pricing/zone-book', virtualController.createZoneBook);
router.post('/pricing/segment-book', virtualController.createSegmentBook);
router.get('/pricing/price-books-hierarchy', virtualController.getPriceBookHierarchy);

//================================
// LOCATION SEARCH ROUTES
//================================

// Search locations (states/UTs)
router.get('/pricing/locations/search', locationController.searchLocations);

// Get smart region suggestions
router.get('/pricing/locations/suggest-region', locationController.getRegionSuggestion);

// Get all available regions
router.get('/pricing/locations/regions', locationController.getAllRegions);

// Get location by name
router.get('/pricing/locations/by-name/:name', locationController.getLocationByName);

//================================
// CASCADING LOCATION ROUTES (NEW)
//================================

import * as cascadeController from '../../controllers/admin/locationCascadeController.js';

// Get all countries
router.get('/locations/countries', cascadeController.getCountries);

// Get states by country
router.get('/locations/states', cascadeController.getStates);

// Get cities by state
router.get('/locations/cities', cascadeController.getCities);

// Get currency by country
router.get('/locations/currency', cascadeController.getCurrency);

// Get country details
router.get('/locations/country/:code', cascadeController.getCountryDetails);

//================================
// GEOLOCATION API ROUTES (NEW)
//================================

import * as geoController from '../../controllers/geolocationController.js';

// Auto-detect location from IP
router.get('/locations/detect-from-ip', geoController.getLocationFromIP);

// Lookup location by pincode
router.get('/locations/lookup-pincode', geoController.lookupPincode);

// Get pincode ranges for a location
router.get('/locations/pincode-ranges', geoController.getPincodeRanges);

export default router;

