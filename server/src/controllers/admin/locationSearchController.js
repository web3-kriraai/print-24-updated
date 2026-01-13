import LocationService from '../../services/LocationService.js';
import RegionSuggestionsService from '../../services/RegionSuggestionsService.js';

// Create singleton instances
const locationService = new LocationService();

/**
 * Search locations from database
 * GET /api/admin/pricing/locations/search?query=maharashtra
 */
export const searchLocations = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.json({ success: true, locations: [] });
        }

        // Increase limit to show all districts when searching for states
        // Maharashtra has 36 districts, so 100 is safe for any state
        const limit = parseInt(req.query.limit) || 100;
        const results = locationService.searchLocations(query, limit);

        res.json({
            success: true,
            locations: results,
            count: results.length
        });
    } catch (error) {
        console.error('Location search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search locations',
            error: error.message
        });
    }
};

/**
 * Get smart region suggestions
 * GET /api/admin/pricing/locations/suggest-region?query=west india
 */
export const getRegionSuggestion = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.json({ success: true, suggestion: null });
        }

        const suggestion = RegionSuggestionsService.getSuggestion(query);

        res.json({
            success: true,
            suggestion: suggestion
        });
    } catch (error) {
        console.error('Region suggestion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get region suggestion',
            error: error.message
        });
    }
};

/**
 * Get all available region suggestions
 * GET /api/admin/pricing/locations/regions
 */
export const getAllRegions = async (req, res) => {
    try {
        const regions = RegionSuggestionsService.getAllRegions();

        res.json({
            success: true,
            regions: regions,
            count: regions.length
        });
    } catch (error) {
        console.error('Get regions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get regions',
            error: error.message
        });
    }
};

/**
 * Get location by name
 * GET /api/admin/pricing/locations/by-name/:name
 */
export const getLocationByName = async (req, res) => {
    try {
        const { name } = req.params;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Location name is required'
            });
        }

        const location = locationService.getLocationByName(name);

        if (!location) {
            return res.status(404).json({
                success: false,
                message: `Location "${name}" not found`
            });
        }

        res.json({
            success: true,
            location: location
        });
    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get location',
            error: error.message
        });
    }
};
