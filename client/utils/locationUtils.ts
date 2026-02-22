/**
 * Location Selection Utilities
 * Handles conflict detection and resolution when selecting locations
 */

interface GeoZone {
    _id?: string;
    name: string;
    code?: string;
    level: string;
    pincodeRanges?: Array<{ start: number; end: number }>;
    [key: string]: any;
}

interface LocationSuggestion {
    name: string;
    code: string;
    level: string;
    pincodeRanges?: Array<{ start: number; end: number }>;
    currency?: string;
    source: 'database' | 'existing' | 'smart-suggestion';
    description?: string;
    [key: string]: any;
}

/**
 * Check if a zone with the same name already exists
 */
export const findExistingZone = (
    locationName: string,
    existingZones: GeoZone[]
): GeoZone | undefined => {
    return existingZones.find(zone =>
        zone.name.toUpperCase() === locationName.toUpperCase()
    );
};

/**
 * Handle location selection with conflict detection
 * Returns: { action: 'create' | 'edit' | 'create-custom', data: any }
 */
export const handleLocationSelection = (
    location: LocationSuggestion,
    existingZones: GeoZone[],
    onEdit?: (zone: GeoZone) => void
): { action: 'create' | 'edit' | 'create-custom' | 'cancel'; data?: any } => {

    // Case 1: User clicked on an existing zone
    if (location.source === 'existing') {
        if (onEdit && location._id) {
            onEdit(location as any);
            return { action: 'edit', data: location };
        }
        return { action: 'cancel' };
    }

    // Case 2: Check if a zone with this name already exists
    const existing = findExistingZone(location.name, existingZones);

    if (existing) {
        // Show confirmation dialog
        const choice = confirm(
            `A zone named "${location.name}" already exists.\n\n` +
            `Click OK to create "${location.name} - Custom"\n` +
            `Click Cancel to edit the existing zone`
        );

        if (choice) {
            // Create with modified name
            return {
                action: 'create-custom',
                data: {
                    name: `${location.name} - Custom`,
                    code: location.code,
                    level: location.level,
                    currency_code: location.currency || 'INR',
                    pincodeRanges: location.pincodeRanges || []
                }
            };
        } else {
            // Edit existing
            if (onEdit) {
                onEdit(existing);
            }
            return { action: 'edit', data: existing };
        }
    }

    // Case 3: No conflict - create new zone
    return {
        action: 'create',
        data: {
            name: location.name,
            code: location.code,
            level: location.level,
            currency_code: location.currency || 'INR',
            pincodeRanges: location.pincodeRanges || []
        }
    };
};

/**
 * Format location data for form
 */
export const formatLocationForForm = (location: LocationSuggestion) => {
    return {
        name: location.name,
        code: location.code,
        level: location.level,
        currency_code: location.currency || 'INR',
        pincodeRanges: location.pincodeRanges || []
    };
};

/**
 * Validate location data
 */
export const validateLocationData = (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
        errors.push('Zone name is required');
    }

    if (!data.code || data.code.trim() === '') {
        errors.push('Zone code is required');
    }

    if (!data.level) {
        errors.push('Zone level is required');
    }

    if (!data.pincodeRanges || data.pincodeRanges.length === 0) {
        errors.push('At least one pincode range is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Merge overlapping pincode ranges
 */
export const mergePincodeRanges = (
    ranges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> => {
    if (ranges.length === 0) return [];

    // Sort by start pincode
    const sorted = [...ranges].sort((a, b) => a.start - b.start);

    const merged: Array<{ start: number; end: number }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];

        // Check if ranges overlap or are adjacent
        if (current.start <= last.end + 1) {
            // Merge ranges
            last.end = Math.max(last.end, current.end);
        } else {
            // Add new range
            merged.push(current);
        }
    }

    return merged;
};
