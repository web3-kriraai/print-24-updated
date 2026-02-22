import LocationService from './LocationService.js';

/**
 * RegionSuggestionsService - Provides smart region combinations
 * Handles predefined region groupings like "West India", "North India"
 */
class RegionSuggestionsService {
    constructor() {
        // Predefined region combinations
        this.regionCombinations = {
            'west india': {
                name: 'West India Region',
                level: 'REGION',
                states: ['GUJARAT', 'MAHARASHTRA', 'GOA'],
                description: 'Combines Gujarat, Maharashtra, and Goa'
            },
            'north india': {
                name: 'North India Region',
                level: 'REGION',
                states: ['DELHI', 'HARYANA', 'PUNJAB', 'HIMACHAL PRADESH', 'UTTARAKHAND'],
                description: 'Combines North Indian states and UTs'
            },
            'south india': {
                name: 'South India Region',
                level: 'REGION',
                states: ['KARNATAKA', 'TAMIL NADU', 'KERALA', 'ANDHRA PRADESH', 'TELANGANA'],
                description: 'Combines South Indian states'
            },
            'east india': {
                name: 'East India Region',
                level: 'REGION',
                states: ['WEST BENGAL', 'ODISHA', 'BIHAR', 'JHARKHAND'],
                description: 'Combines East Indian states'
            },
            'northeast india': {
                name: 'Northeast India Region',
                level: 'REGION',
                states: ['ASSAM', 'ARUNACHAL PRADESH', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'TRIPURA', 'SIKKIM'],
                description: 'Combines all Northeast states'
            },
            'central india': {
                name: 'Central India Region',
                level: 'REGION',
                states: ['MADHYA PRADESH', 'CHHATTISGARH'],
                description: 'Combines Central Indian states'
            }
        };
    }

    /**
     * Get region suggestion based on query
     */
    getSuggestion(query) {
        const searchTerm = query.toLowerCase().trim();
        const match = this.regionCombinations[searchTerm];

        if (!match) {
            return null;
        }

        // Get locations for the states in this region
        const locations = LocationService.getLocationsByNames(match.states);

        // Combine pincode ranges
        const combinedRanges = [];
        locations.forEach(loc => {
            if (loc.pincodeRanges) {
                combinedRanges.push(...loc.pincodeRanges);
            }
        });

        // Sort ranges by start pincode
        combinedRanges.sort((a, b) => a.start - b.start);

        // Generate code from region name
        const code = match.name
            .split(' ')
            .filter(w => w !== 'Region')
            .map(w => w[0])
            .join('')
            .toUpperCase();

        return {
            name: match.name,
            code: code,
            level: match.level,
            pincodeRanges: combinedRanges,
            currency: 'INR',
            description: match.description,
            source: 'smart-suggestion',
            statesIncluded: match.states
        };
    }

    /**
     * Get all available region suggestions
     */
    getAllRegions() {
        return Object.keys(this.regionCombinations).map(key => ({
            query: key,
            name: this.regionCombinations[key].name,
            description: this.regionCombinations[key].description
        }));
    }

    /**
     * Add custom region combination
     */
    addCustomRegion(key, regionData) {
        this.regionCombinations[key.toLowerCase()] = regionData;
    }
}

export default new RegionSuggestionsService();
