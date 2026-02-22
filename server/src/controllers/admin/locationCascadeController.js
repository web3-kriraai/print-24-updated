import LocationService from '../../services/LocationService.js';

// Create a singleton instance for all location operations
const locationService = new LocationService();

/**
 * CASCADING LOCATION CONTROLLERS
 * 
 * Provides API endpoints for cascading location selection:
 * - Countries
 * - States (filtered by country)
 * - Cities (filtered by state)
 * - Currency mapping
 */

/**
 * GET /api/admin/locations/countries
 * Get all countries with currency info
 */
export const getCountries = async (req, res) => {
    try {
        const countries = locationService.getCountries();

        res.json({
            success: true,
            data: countries,
            count: countries.length
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch countries',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/locations/states?country=US
 * Get states/provinces for a specific country
 */
export const getStates = async (req, res) => {
    try {
        const { country } = req.query;

        if (!country) {
            return res.status(400).json({
                success: false,
                message: 'Country code is required'
            });
        }

        const states = locationService.getStatesByCountry(country);

        res.json({
            success: true,
            data: states,
            count: states.length,
            country: country
        });
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch states',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/locations/cities?country=US&state=CA
 * Get cities for a specific state
 */
export const getCities = async (req, res) => {
    try {
        const { country, state } = req.query;

        if (!country || !state) {
            return res.status(400).json({
                success: false,
                message: 'Country and state codes are required'
            });
        }

        const cities = locationService.getCitiesByState(country, state);

        res.json({
            success: true,
            data: cities,
            count: cities.length,
            country: country,
            state: state
        });
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cities',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/locations/currency?country=US
 * Get currency for a specific country
 */
export const getCurrency = async (req, res) => {
    try {
        const { country } = req.query;

        if (!country) {
            return res.status(400).json({
                success: false,
                message: 'Country code is required'
            });
        }

        const currency = locationService.getCurrencyByCountry(country);
        const countryDetails = locationService.getCountryByCode(country);

        res.json({
            success: true,
            data: {
                currency: currency,
                country: countryDetails?.name || country,
                countryCode: country
            }
        });
    } catch (error) {
        console.error('Error fetching currency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch currency',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/locations/country/:code
 * Get detailed information about a specific country
 */
export const getCountryDetails = async (req, res) => {
    try {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Country code is required'
            });
        }

        const country = locationService.getCountryByCode(code);

        if (!country) {
            return res.status(404).json({
                success: false,
                message: 'Country not found'
            });
        }

        res.json({
            success: true,
            data: country
        });
    } catch (error) {
        console.error('Error fetching country details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch country details',
            error: error.message
        });
    }
};
