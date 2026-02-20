import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Country, State, City } from 'country-state-city';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * LocationService - Handles location database operations
 * Provides methods to search and retrieve location data
 * NOW INCLUDES: States (28) + UTs (8) + Districts (754)
 */
class LocationService {
    constructor() {
        this.locationsPath = path.join(__dirname, '../../data/india-locations-with-districts.json');
        this.locationsCache = null;
    }

    /**
     * Load location database (with caching)
     */
    loadLocations() {
        if (this.locationsCache) {
            return this.locationsCache;
        }

        try {
            const data = fs.readFileSync(this.locationsPath, 'utf-8');
            this.locationsCache = JSON.parse(data);
            return this.locationsCache;
        } catch (error) {
            console.error('Failed to load location database:', error);
            return { states: [], unionTerritories: [], districts: [] };
        }
    }

    /**
     * Get all locations (states + UTs + districts)
     */
    getAllLocations() {
        const data = this.loadLocations();
        return [
            ...data.states.map(s => ({ ...s, source: 'database' })),
            ...data.unionTerritories.map(ut => ({ ...ut, source: 'database' })),
            ...data.districts.map(d => ({
                ...d,
                source: 'database',
                displayName: `${d.name} (${d.stateName})` // e.g., "PUNE (MAHARASHTRA)"
            }))
        ];
    }

    /**
     * Search locations by query (name or code)
     * Searches: States, UTs, and Districts
     * Smart prioritization: If exact state match → show state + ALL its districts first
     */
    searchLocations(query, limit = 100) {
        if (!query || query.length < 2) {
            return [];
        }

        const allLocations = this.getAllLocations();
        const searchTerm = query.toLowerCase();

        // Check for exact state/UT match
        const exactStateMatch = allLocations.find(loc =>
            (loc.level === 'STATE' || loc.level === 'UT') &&
            (loc.name.toLowerCase() === searchTerm || loc.code.toLowerCase() === searchTerm)
        );

        // If exact state match found, prioritize showing state + ALL its districts
        if (exactStateMatch) {
            const stateName = exactStateMatch.name;

            // Get ALL districts of this state
            const stateDistricts = allLocations.filter(loc =>
                loc.level === 'DISTRICT' && loc.stateName === stateName
            );

            // Get other partial matches (excluding the state and its districts)
            const otherMatches = allLocations.filter(loc => {
                if (loc === exactStateMatch) return false;
                if (loc.level === 'DISTRICT' && loc.stateName === stateName) return false;

                const nameMatch = loc.name.toLowerCase().includes(searchTerm);
                const codeMatch = loc.code.toLowerCase().includes(searchTerm);
                const displayMatch = loc.displayName?.toLowerCase().includes(searchTerm);

                return nameMatch || codeMatch || displayMatch;
            });

            // Return: State first → ALL its districts → Other matches
            return [
                exactStateMatch,
                ...stateDistricts,
                ...otherMatches
            ].slice(0, limit);
        }

        // No exact state match - return all matches sorted by relevance
        const matches = allLocations.filter(loc => {
            const nameMatch = loc.name.toLowerCase().includes(searchTerm);
            const codeMatch = loc.code.toLowerCase().includes(searchTerm);
            const displayMatch = loc.displayName?.toLowerCase().includes(searchTerm);
            const stateMatch = loc.stateName?.toLowerCase().includes(searchTerm);

            return nameMatch || codeMatch || displayMatch || stateMatch;
        });

        // Sort by relevance: STATE/UT > DISTRICT > others
        matches.sort((a, b) => {
            const levelPriority = { 'STATE': 1, 'UT': 1, 'DISTRICT': 2, 'REGION': 3 };
            const aPriority = levelPriority[a.level] || 4;
            const bPriority = levelPriority[b.level] || 4;

            if (aPriority !== bPriority) return aPriority - bPriority;

            // Within same level, sort alphabetically
            return a.name.localeCompare(b.name);
        });

        return matches.slice(0, limit);
    }

    /**
     * Get location by exact name
     */
    getLocationByName(name) {
        const allLocations = this.getAllLocations();
        return allLocations.find(loc =>
            loc.name.toUpperCase() === name.toUpperCase()
        );
    }

    /**
     * Get locations by state codes
     */
    getLocationsByCodes(codes) {
        const allLocations = this.getAllLocations();
        return allLocations.filter(loc => codes.includes(loc.code));
    }

    /**
     * Get locations by names
     */
    getLocationsByNames(names) {
        const allLocations = this.getAllLocations();
        const upperNames = names.map(n => n.toUpperCase());
        return allLocations.filter(loc =>
            upperNames.includes(loc.name.toUpperCase())
        );
    }

    /**
     * Clear cache (useful for testing or updates)
     */
    clearCache() {
        this.locationsCache = null;
    }

    /**
     * ========================================
     * CASCADING LOCATION METHODS (NEW)
     * ========================================
     */

    /**
     * Get all countries with currency mapping
     * Uses country-state-city package for international data
     */
    getCountries() {
        try {
            const countries = Country.getAllCountries();

            return countries.map(country => ({
                name: country.name,
                code: country.isoCode,
                level: 'COUNTRY',
                currency: country.currency || 'USD',
                phoneCode: country.phonecode,
                flag: country.flag,
                source: 'csc-package'
            })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Failed to load countries:', error);
            return [];
        }
    }

    /**
     * Get states/provinces by country code
     * @param {string} countryCode - ISO 2-letter country code
     */
    getStatesByCountry(countryCode) {
        try {
            const states = State.getStatesOfCountry(countryCode);

            return states.map(state => ({
                name: state.name,
                code: state.isoCode,
                stateCode: state.isoCode,
                countryCode: state.countryCode,
                level: 'STATE',
                latitude: state.latitude,
                longitude: state.longitude,
                source: 'csc-package'
            })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error(`Failed to load states for ${countryCode}:`, error);
            return [];
        }
    }

    /**
     * Get cities by country and state code
     * @param {string} countryCode - ISO 2-letter country code
     * @param {string} stateCode - State ISO code
     */
    getCitiesByState(countryCode, stateCode) {
        try {
            const cities = City.getCitiesOfState(countryCode, stateCode);

            return cities.map(city => ({
                name: city.name,
                countryCode: city.countryCode,
                stateCode: city.stateCode,
                level: 'CITY',
                latitude: city.latitude,
                longitude: city.longitude,
                source: 'csc-package'
            })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error(`Failed to load cities for ${countryCode}/${stateCode}:`, error);
            return [];
        }
    }

    /**
     * Get currency by country code
     * @param {string} countryCode - ISO 2-letter country code
     */
    getCurrencyByCountry(countryCode) {
        try {
            const country = Country.getCountryByCode(countryCode);
            return country?.currency || 'USD';
        } catch (error) {
            console.error(`Failed to get currency for ${countryCode}:`, error);
            return 'USD';
        }
    }

    /**
     * Get country details by code
     * @param {string} countryCode - ISO 2-letter country code
     */
    getCountryByCode(countryCode) {
        try {
            const country = Country.getCountryByCode(countryCode);

            if (!country) return null;

            return {
                name: country.name,
                code: country.isoCode,
                level: 'COUNTRY',
                currency: country.currency || 'USD',
                phoneCode: country.phonecode,
                flag: country.flag,
                capital: country.capital,
                region: country.region,
                timezones: country.timezones,
                source: 'csc-package'
            };
        } catch (error) {
            console.error(`Failed to get country ${countryCode}:`, error);
            return null;
        }
    }
}

export default LocationService;
