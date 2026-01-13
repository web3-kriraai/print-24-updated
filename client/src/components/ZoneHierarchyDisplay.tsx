import React from 'react';
import { ChevronRight, MapPin, CheckCircle, Circle } from 'lucide-react';

interface GeoZone {
    _id: string;
    name: string;
    level: string;
    code?: string;
}

interface ZoneHierarchyDisplayProps {
    geoZoneHierarchy?: GeoZone[];
    usedZoneId?: string;
    usedZoneName?: string;
    usedZoneLevel?: string;
    currentZoneName?: string;
    compact?: boolean;
}

/**
 * ZoneHierarchyDisplay Component
 * Shows the zone hierarchy and which zone's pricing is being used
 * 
 * Features:
 * - Visual hierarchy chain (City → State → Region → Country)
 * - Highlights active zone (where price was found)
 * - Compact mode for inline display
 * - Expandable details view
 */
export const ZoneHierarchyDisplay: React.FC<ZoneHierarchyDisplayProps> = ({
    geoZoneHierarchy = [],
    usedZoneId,
    usedZoneName,
    usedZoneLevel,
    currentZoneName,
    compact = false
}) => {
    // If no hierarchy, don't render
    if (!geoZoneHierarchy || geoZoneHierarchy.length === 0) {
        return null;
    }

    // Determine which zone is active
    const activeZoneId = usedZoneId || geoZoneHierarchy[0]?._id;
    const activeZoneName = usedZoneName || geoZoneHierarchy[0]?.name;
    const activeZoneLevel = usedZoneLevel || geoZoneHierarchy[0]?.level;

    // Compact mode - single line display
    if (compact) {
        return (
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                <MapPin size={14} className="text-blue-600" />
                <span>
                    Pricing from: <strong className="text-blue-700">{activeZoneName}</strong>
                    {activeZoneLevel && <span className="text-xs ml-1">({activeZoneLevel})</span>}
                </span>
            </div>
        );
    }

    // Full display with hierarchy
    return (
        <div className="border border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-blue-600" />
                <h4 className="font-semibold text-gray-800">Your Location Pricing</h4>
            </div>

            {/* Current Location */}
            <div className="mb-3">
                <p className="text-sm text-gray-600">
                    📍 Detected Location: <strong>{currentZoneName || activeZoneName}</strong>
                </p>
                <p className="text-sm text-green-700 font-medium">
                    💰 Using: <strong>{activeZoneName}</strong>
                    <span className="text-xs ml-1 text-gray-600">({activeZoneLevel})</span>
                </p>
            </div>

            {/* Zone Hierarchy Details */}
            <details className="group">
                <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <span>View Zone Hierarchy</span>
                    <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                </summary>

                <div className="mt-3 space-y-2 pl-2">
                    <p className="text-xs text-gray-500 mb-2">
                        Pricing checked in this order (most specific first):
                    </p>

                    {geoZoneHierarchy.map((zone, index) => {
                        const isActive = zone._id === activeZoneId;
                        const wasChecked = geoZoneHierarchy.findIndex(z => z._id === activeZoneId) >= index;

                        return (
                            <div
                                key={zone._id}
                                className={`flex items-start gap-2 p-2 rounded ${isActive
                                        ? 'bg-green-100 border border-green-300'
                                        : wasChecked
                                            ? 'bg-gray-50'
                                            : 'bg-white opacity-60'
                                    }`}
                            >
                                <div className="mt-0.5">
                                    {isActive ? (
                                        <CheckCircle size={16} className="text-green-600" />
                                    ) : (
                                        <Circle size={16} className="text-gray-400" />
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-gray-500">
                                            {index + 1}.
                                        </span>
                                        <span className={`text-sm font-medium ${isActive ? 'text-green-800' : 'text-gray-700'
                                            }`}>
                                            {zone.name}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-white border border-gray-200">
                                            {zone.level}
                                        </span>
                                    </div>

                                    {isActive && (
                                        <p className="text-xs text-green-700 mt-1">
                                            ✓ Price found - using this zone's pricing
                                        </p>
                                    )}

                                    {!isActive && wasChecked && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ⏭️ No price found - checked next zone
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Fallback info */}
                    {!usedZoneId && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            ℹ️ No zone-specific pricing found. Using master pricing.
                        </div>
                    )}
                </div>
            </details>
        </div>
    );
};

export default ZoneHierarchyDisplay;
