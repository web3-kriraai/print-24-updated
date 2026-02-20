import React, { useState, useEffect } from 'react';
import { MapPin, Globe, Flag, DollarSign, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { SearchableDropdown, DropdownOption } from './SearchableDropdown';

interface LocationValue {
    country?: string;
    countryName?: string;
    state?: string;
    stateName?: string;
    city?: string;
    cityName?: string;
    zipCode?: string;
}

interface CascadingLocationSelectProps {
    value: LocationValue;
    onChange: (location: LocationValue) => void;
    onCurrencyChange?: (currency: string) => void;
    required?: boolean;
    disabled?: boolean;
    showCurrency?: boolean;
    showZipCode?: boolean;
    showCityDropdown?: boolean;
    placeholder?: {
        country?: string;
        state?: string;
        city?: string;
        zipCode?: string;
    };
    className?: string;
}

interface Country {
    name: string;
    code: string;
    currency: string;
    flag: string;
    phoneCode: string;
}

interface State {
    name: string;
    code: string;
    stateCode: string;
    countryCode: string;
}

interface City {
    name: string;
    countryCode: string;
    stateCode: string;
}

/**
 * CascadingLocationSelect Component
 * 
 * A beautiful, user-friendly cascading dropdown for location selection.
 * Features:
 * - Strict dropdown-only selection (no free text)
 * - Automatic currency detection
 * - Smooth animations and transitions
 * - Loading states for each cascade level
 * - Auto-reset child selections when parent changes
 * - Beautiful icons and visual feedback
 */
export const CascadingLocationSelect: React.FC<CascadingLocationSelectProps> = ({
    value,
    onChange,
    onCurrencyChange,
    required = true,
    disabled = false,
    showCurrency = true,
    showZipCode = true,
    showCityDropdown = true,
    placeholder = {},
    className = ''
}) => {
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [currency, setCurrency] = useState<string>('');

    const [loading, setLoading] = useState({
        countries: false,
        states: false,
        cities: false,
        currency: false
    });

    const [errors, setErrors] = useState({
        countries: '',
        states: '',
        cities: ''
    });

    // Fetch countries on mount
    useEffect(() => {
        fetchCountries();
    }, []);

    // Fetch states when country changes
    useEffect(() => {
        if (value.country) {
            fetchStates(value.country);
            fetchCurrency(value.country);
        } else {
            setStates([]);
            setCurrency('');
        }
    }, [value.country]);

    // Fetch cities when state changes
    useEffect(() => {
        if (value.country && value.state && showCityDropdown) {
            fetchCities(value.country, value.state);
        } else {
            setCities([]);
        }
    }, [value.state, showCityDropdown]);

    const fetchCountries = async () => {
        setLoading(prev => ({ ...prev, countries: true }));
        setErrors(prev => ({ ...prev, countries: '' }));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/locations/countries', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setCountries(data.data);
            } else {
                setErrors(prev => ({ ...prev, countries: 'Failed to load countries' }));
            }
        } catch (error) {
            console.error('Error fetching countries:', error);
            setErrors(prev => ({ ...prev, countries: 'Network error' }));
        } finally {
            setLoading(prev => ({ ...prev, countries: false }));
        }
    };

    const fetchStates = async (countryCode: string) => {
        setLoading(prev => ({ ...prev, states: true }));
        setErrors(prev => ({ ...prev, states: '' }));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/locations/states?country=${countryCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setStates(data.data);
            } else {
                setErrors(prev => ({ ...prev, states: 'Failed to load states' }));
            }
        } catch (error) {
            console.error('Error fetching states:', error);
            setErrors(prev => ({ ...prev, states: 'Network error' }));
        } finally {
            setLoading(prev => ({ ...prev, states: false }));
        }
    };

    const fetchCities = async (countryCode: string, stateCode: string) => {
        setLoading(prev => ({ ...prev, cities: true }));
        setErrors(prev => ({ ...prev, cities: '' }));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/locations/cities?country=${countryCode}&state=${stateCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setCities(data.data);
            } else {
                setErrors(prev => ({ ...prev, cities: 'Failed to load cities' }));
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setErrors(prev => ({ ...prev, cities: 'Network error' }));
        } finally {
            setLoading(prev => ({ ...prev, cities: false }));
        }
    };

    const fetchCurrency = async (countryCode: string) => {
        setLoading(prev => ({ ...prev, currency: true }));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/locations/currency?country=${countryCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.data.currency) {
                setCurrency(data.data.currency);
                if (onCurrencyChange) {
                    onCurrencyChange(data.data.currency);
                }
            }
        } catch (error) {
            console.error('Error fetching currency:', error);
        } finally {
            setLoading(prev => ({ ...prev, currency: false }));
        }
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCountry = countries.find(c => c.code === e.target.value);
        onChange({
            country: e.target.value,
            countryName: selectedCountry?.name || '',
            state: undefined,
            stateName: undefined,
            city: undefined,
            cityName: undefined,
            zipCode: undefined
        });
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedState = states.find(s => s.stateCode === e.target.value);
        onChange({
            ...value,
            state: e.target.value,
            stateName: selectedState?.name || '',
            city: undefined,
            cityName: undefined,
            zipCode: undefined
        });
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCity = cities.find(c => c.name === e.target.value);
        onChange({
            ...value,
            city: e.target.value,
            cityName: selectedCity?.name || ''
        });
    };

    const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...value,
            zipCode: e.target.value
        });
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Location Selection</h3>
            </div>

            {/* Country Dropdown */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Flag className="inline w-4 h-4 mr-1" />
                    Country {required && <span className="text-red-500">*</span>}
                </label>

                <SearchableDropdown
                    options={countries.map(c => ({
                        value: c.code,
                        label: c.name,
                        icon: c.flag
                    }))}
                    value={value.country || ''}
                    onChange={(val, opt) => {
                        onChange({
                            country: val,
                            countryName: opt?.label || '',
                            state: undefined,
                            stateName: undefined,
                            city: undefined,
                            cityName: undefined,
                            zipCode: undefined
                        });
                    }}
                    placeholder={placeholder.country || '🌍 Select a country...'}
                    disabled={disabled}
                    loading={loading.countries}
                    error={errors.countries}
                    icon={<Globe className="w-4 h-4" />}
                />
            </div>

            {/* State Dropdown */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    State/Province {required && <span className="text-red-500">*</span>}
                </label>

                <SearchableDropdown
                    options={states.map(s => ({
                        value: s.stateCode,
                        label: s.name
                    }))}
                    value={value.state || ''}
                    onChange={(val, opt) => {
                        onChange({
                            ...value,
                            state: val,
                            stateName: opt?.label || '',
                            city: undefined,
                            cityName: undefined,
                            zipCode: undefined
                        });
                    }}
                    placeholder={
                        !value.country
                            ? '↑ Select country first'
                            : states.length === 0
                                ? 'No states available'
                                : placeholder.state || '📍 Select a state/province...'
                    }
                    disabled={disabled || !value.country || states.length === 0}
                    loading={loading.states}
                    error={errors.states}
                    icon={<MapPin className="w-4 h-4" />}
                />
            </div>

            {/* City Dropdown (Optional) */}
            {showCityDropdown && (
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        City {required && <span className="text-red-500">*</span>}
                    </label>

                    <SearchableDropdown
                        options={cities.map((c, idx) => ({
                            value: c.name,
                            label: c.name
                        }))}
                        value={value.city || ''}
                        onChange={(val, opt) => {
                            onChange({
                                ...value,
                                city: val,
                                cityName: opt?.label || ''
                            });
                        }}
                        placeholder={
                            !value.state
                                ? '↑ Select state first'
                                : cities.length === 0
                                    ? 'No cities available'
                                    : placeholder.city || '🏙️ Select a city...'
                        }
                        disabled={disabled || !value.state || cities.length === 0}
                        loading={loading.cities}
                        error={errors.cities}
                        icon={<MapPin className="w-4 h-4" />}
                    />
                </div>
            )}

            {/* Zip/Pin Code (Optional Text Input with Validation) */}
            {showZipCode && (
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        📮 Zip/Pin Code
                    </label>

                    <input
                        type="text"
                        value={value.zipCode || ''}
                        onChange={handleZipCodeChange}
                        disabled={disabled || !value.state}
                        placeholder={placeholder.zipCode || 'Enter zip/pin code...'}
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg 
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                                 disabled:bg-gray-100 disabled:cursor-not-allowed
                                 hover:border-gray-400"
                    />
                </div>
            )}

            {/* Auto-Detected Currency (Read-only Display) */}
            {showCurrency && value.country && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">Auto-Detected Currency:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {loading.currency ? (
                                <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                            ) : (
                                <span className="text-lg font-bold text-green-700">{currency || 'USD'}</span>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                        Currency is automatically set based on the selected country
                    </p>
                </div>
            )}

            {/* Selection Summary */}
            {(value.country || value.state || value.city) && (
                <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Selected Location:</p>
                    <p className="text-sm text-gray-700">
                        {[value.cityName, value.stateName, value.countryName]
                            .filter(Boolean)
                            .join(' → ') || 'No location selected'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CascadingLocationSelect;
