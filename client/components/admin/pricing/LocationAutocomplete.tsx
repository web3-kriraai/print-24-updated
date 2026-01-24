import React, { useEffect } from 'react';

interface LocationSuggestion {
    name: string;
    code: string;
    level: string;
    pincodeRanges?: Array<{ start: number; end: number }>;
    currency?: string;
    source: 'database' | 'existing' | 'smart-suggestion';
    description?: string;
    districtCount?: number;
    statesIncluded?: string[];
    displayName?: string;  // For districts: "PUNE (MAHARASHTRA)"
    stateName?: string;    // For districts: parent state name
    stateCode?: string;    // For districts: parent state code
}

interface LocationAutocompleteProps {
    locationSearch: string;
    locationSuggestions: LocationSuggestion[];
    showSuggestions: boolean;
    isLoading: boolean;
    onSearchChange: (value: string) => void;
    onSelectLocation: (location: LocationSuggestion) => void;
    onFocus: () => void;
    onClose: () => void;
}

/**
 * LocationAutocomplete Component
 * Displays search input with autocomplete suggestions for locations
 */
export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
    locationSearch,
    locationSuggestions,
    showSuggestions,
    isLoading,
    onSearchChange,
    onSelectLocation,
    onFocus,
    onClose
}) => {
    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (showSuggestions && !target.closest('.location-autocomplete-container')) {
                onClose();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showSuggestions, onClose]);

    return (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 location-autocomplete-container">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Quick Search (Optional)
            </label>
            <p className="text-xs text-gray-600 mb-3">
                Search for states, union territories, districts, or type "West India", "North India" for smart suggestions
            </p>

            <div className="relative">
                <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={onFocus}
                    placeholder="Type state name, code, or region (e.g., Maharashtra, MH, West India)..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />

                {isLoading && (
                    <div className="absolute right-3 top-2.5">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-2 w-full border border-gray-200 rounded-lg bg-white shadow-xl max-h-96 overflow-y-auto">
                        {locationSuggestions.map((loc, idx) => (
                            <LocationSuggestionItem
                                key={idx}
                                location={loc}
                                onClick={() => onSelectLocation(loc)}
                            />
                        ))}
                    </div>
                )}

                {showSuggestions && locationSuggestions.length === 0 && !isLoading && locationSearch.length >= 2 && (
                    <div className="absolute z-50 mt-2 w-full border border-gray-200 rounded-lg bg-white shadow-xl p-4 text-center text-gray-500">
                        No locations found for "{locationSearch}"
                    </div>
                )}
            </div>

            <p className="text-xs text-gray-500 mt-2">
                💡 Or fill the form manually below
            </p>
        </div>
    );
};

/**
 * LocationSuggestionItem Component
 * Individual suggestion item in the dropdown
 */
interface LocationSuggestionItemProps {
    location: LocationSuggestion;
    onClick: () => void;
}

const LocationSuggestionItem: React.FC<LocationSuggestionItemProps> = ({ location, onClick }) => {
    const getBackgroundClass = () => {
        switch (location.source) {
            case 'smart-suggestion':
                return 'hover:bg-purple-50 bg-purple-25 border-l-4 border-purple-500';
            case 'existing':
                return 'hover:bg-green-50 bg-green-25';
            default:
                return 'hover:bg-blue-50';
        }
    };

    const getBadgeClass = () => {
        switch (location.source) {
            case 'smart-suggestion':
                return 'bg-purple-100 text-purple-700';
            case 'existing':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-blue-100 text-blue-700';
        }
    };

    const getBadgeText = () => {
        switch (location.source) {
            case 'smart-suggestion':
                return '✨ Smart';
            case 'existing':
                return 'Existing';
            default:
                return 'Database';
        }
    };

    const getSourceIcon = () => {
        switch (location.source) {
            case 'smart-suggestion':
                return '✨';
            case 'existing':
                return '✏️';
            default:
                return '📍';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${getBackgroundClass()}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                        {getSourceIcon()} {location.displayName || location.name}
                    </div>

                    {location.description && (
                        <div className="text-xs text-purple-600 mt-1 font-medium">
                            {location.description}
                        </div>
                    )}

                    <div className="text-xs text-gray-500 mt-1">
                        {location.level} • Code: {location.code}
                        {location.stateName && ` • State: ${location.stateName}`}
                        {location.districtCount && ` • Districts: ${location.districtCount}`}
                    </div>

                    {location.pincodeRanges && location.pincodeRanges.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                            {location.pincodeRanges.length} pincode range(s) •
                            {location.pincodeRanges[0].start} - {location.pincodeRanges[location.pincodeRanges.length - 1].end}
                        </div>
                    )}

                    {location.statesIncluded && (
                        <div className="text-xs text-gray-600 mt-1">
                            Includes: {location.statesIncluded.slice(0, 3).join(', ')}
                            {location.statesIncluded.length > 3 && ` +${location.statesIncluded.length - 3} more`}
                        </div>
                    )}
                </div>

                <span className={`ml-2 px-2 py-1 text-xs rounded font-semibold ${getBadgeClass()}`}>
                    {getBadgeText()}
                </span>
            </div>
        </div>
    );
};
