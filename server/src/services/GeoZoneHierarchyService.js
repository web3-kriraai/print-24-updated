import GeoZoneMapping from '../models/GeoZonMapping.js';

/**
 * GeoZoneHierarchyService
 * Resolves geographic zones in hierarchical order based on pincode
 * 
 * Hierarchy (Most Specific → Least Specific):
 * ZIP → CITY → DISTRICT → STATE/UT → REGION → COUNTRY
 */
class GeoZoneHierarchyService {
    /**
     * Level priority mapping (lower number = more specific)
     */
    static LEVEL_PRIORITY = {
        'ZIP': 1,
        'CITY': 2,
        'DISTRICT': 3,
        'STATE': 4,
        'UT': 4,      // Union Territory same priority as State
        'REGION': 5,
        'COUNTRY': 6,
        'ZONE': 7     // Generic zone
    };

    /**
     * Resolve zone hierarchy for a given pincode
     * Returns array of zones sorted from most specific to least specific
     * 
     * @param {String|Number} pincode - 6-digit pincode
     * @returns {Promise<Array>} Array of GeoZone objects in hierarchy order
     */
    async resolveZoneHierarchy(pincode) {
        try {
            if (!pincode) {
                console.log('⚠️ No pincode provided for zone hierarchy');
                return [];
            }

            const pincodeNum = parseInt(pincode);

            if (isNaN(pincodeNum)) {
                console.log(`❌ Invalid pincode format: ${pincode}`);
                return [];
            }

            console.log(`🔍 Resolving zone hierarchy for pincode: ${pincodeNum}`);

            // Find all zones that contain this pincode
            const matchingZones = await this.findAllMatchingZones(pincodeNum);

            if (matchingZones.length === 0) {
                console.log(`⚠️ No zones found for pincode: ${pincodeNum}`);
                return [];
            }

            // Sort by specificity
            const hierarchy = this.sortBySpecificity(matchingZones);

            console.log(`✅ Zone hierarchy resolved (${hierarchy.length} zones):`);
            hierarchy.forEach((zone, index) => {
                console.log(`   ${index + 1}. ${zone.name} (${zone.level}) - Priority: ${zone.priority || 0}`);
            });

            return hierarchy;
        } catch (error) {
            console.error('Error resolving zone hierarchy:', error);
            return [];
        }
    }

    /**
     * Find all zones where the pincode falls within their range
     * 
     * @param {Number} pincodeNum - Numeric pincode
     * @returns {Promise<Array>} Array of GeoZone objects
     */
    async findAllMatchingZones(pincodeNum) {
        try {
            // Query all mappings where pincode is in range
            const mappings = await GeoZoneMapping.find({
                pincodeStart: { $lte: pincodeNum },
                pincodeEnd: { $gte: pincodeNum }
            })
                .populate('geoZone')
                .lean();

            // Extract zones and attach range size for sorting
            const zones = mappings
                .map(mapping => {
                    if (!mapping.geoZone) return null;
                    
                    // Attach range size (smaller = more specific)
                    const rangeSize = mapping.pincodeEnd - mapping.pincodeStart + 1;
                    return {
                        ...mapping.geoZone,
                        _rangeSize: rangeSize,
                        _pincodeStart: mapping.pincodeStart,
                        _pincodeEnd: mapping.pincodeEnd
                    };
                })
                .filter(zone => zone != null);

            console.log(`   Found ${zones.length} matching zones for pincode ${pincodeNum}`);
            zones.forEach(zone => {
                console.log(`      - ${zone.name} (${zone.level}): ${zone._pincodeStart}-${zone._pincodeEnd} (size: ${zone._rangeSize})`);
            });

            return zones;
        } catch (error) {
            console.error('Error finding matching zones:', error);
            return [];
        }
    }

    /**
     * Sort zones by specificity (most specific first)
     * 
     * Sorting criteria:
     * 1. Level priority (ZIP > CITY > DISTRICT > STATE > REGION > COUNTRY)
     * 2. Zone priority field (higher = more specific)
     * 3. Range size (smaller = more specific) - NEW!
     * 4. Alphabetical by name (tie-breaker)
     * 
     * @param {Array} zones - Array of GeoZone objects
     * @returns {Array} Sorted array
     */
    sortBySpecificity(zones) {
        return zones.sort((a, b) => {
            // 1. Sort by level priority
            const aLevelPriority = GeoZoneHierarchyService.LEVEL_PRIORITY[a.level] || 99;
            const bLevelPriority = GeoZoneHierarchyService.LEVEL_PRIORITY[b.level] || 99;

            if (aLevelPriority !== bLevelPriority) {
                return aLevelPriority - bLevelPriority;
            }

            // 2. If same level, sort by zone priority (higher = more specific)
            const aPriority = a.priority || 0;
            const bPriority = b.priority || 0;

            if (aPriority !== bPriority) {
                return bPriority - aPriority; // Descending order
            }

            // 3. If same priority, sort by range size (smaller = more specific)
            const aRangeSize = a._rangeSize || Infinity;
            const bRangeSize = b._rangeSize || Infinity;

            if (aRangeSize !== bRangeSize) {
                return aRangeSize - bRangeSize; // Ascending order (smaller first)
            }

            // 4. Tie-breaker: alphabetical
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get zone hierarchy as a readable string
     * Example: "Surat → Gujarat → West India → India"
     * 
     * @param {Array} hierarchy - Array of zones
     * @returns {String} Formatted hierarchy string
     */
    formatHierarchy(hierarchy) {
        if (!hierarchy || hierarchy.length === 0) {
            return 'No zones';
        }

        return hierarchy
            .map(zone => `${zone.name} (${zone.level})`)
            .join(' → ');
    }

    /**
     * Check if a zone hierarchy contains a specific level
     * 
     * @param {Array} hierarchy - Array of zones
     * @param {String} level - Level to check (e.g., 'STATE', 'CITY')
     * @returns {Object|null} Zone object if found, null otherwise
     */
    findZoneByLevel(hierarchy, level) {
        return hierarchy.find(zone => zone.level === level) || null;
    }
}

export default new GeoZoneHierarchyService();
