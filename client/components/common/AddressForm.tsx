import React, { useState } from 'react';
import { MapPin, Package } from 'lucide-react';
import { CascadingLocationSelect } from './CascadingLocationSelect';

interface AddressFormData {
    addressLine1: string;
    addressLine2: string;
    location: {
        country?: string;
        countryName?: string;
        state?: string;
        stateName?: string;
        city?: string;
        cityName?: string;
        zipCode?: string;
    };
}

interface AddressFormProps {
    value: AddressFormData;
    onChange: (data: AddressFormData) => void;
    errors?: {
        addressLine1?: string;
        location?: string;
    };
    required?: boolean;
    disabled?: boolean;
}

/**
 * AddressForm Component
 * 
 * User-facing address input form with cascading location dropdowns.
 * Perfect for checkout, user profile, shipping address, etc.
 * 
 * Features:
 * - Strict dropdown-only location selection (no free text)
 * - Automatic currency detection
 * - Beautiful, responsive UI
 * - Full validation support
 */
export const AddressForm: React.FC<AddressFormProps> = ({
    value,
    onChange,
    errors = {},
    required = true,
    disabled = false
}) => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Shipping Address</h2>
            </div>

            {/* Cascading Location Selection */}
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <CascadingLocationSelect
                    value={value.location}
                    onChange={(location) => {
                        onChange({
                            ...value,
                            location
                        });
                    }}
                    required={required}
                    disabled={disabled}
                    showCurrency={false}
                    showZipCode={true}
                    showCityDropdown={true}
                    placeholder={{
                        country: 'Select your country...',
                        state: 'Select state/province...',
                        city: 'Select city...',
                        zipCode: 'Enter postal code...'
                    }}
                />

                {errors.location && (
                    <p className="text-sm text-red-500 mt-2">{errors.location}</p>
                )}
            </div>

            {/* Street Address */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="inline w-4 h-4 mr-1" />
                        Street Address Line 1 {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        value={value.addressLine1}
                        onChange={(e) => onChange({
                            ...value,
                            addressLine1: e.target.value
                        })}
                        disabled={disabled}
                        required={required}
                        placeholder="House number and street name"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg 
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                                 disabled:bg-gray-100 disabled:cursor-not-allowed
                                 hover:border-gray-400"
                    />
                    {errors.addressLine1 && (
                        <p className="text-sm text-red-500 mt-1">{errors.addressLine1}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address Line 2 <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <input
                        type="text"
                        value={value.addressLine2}
                        onChange={(e) => onChange({
                            ...value,
                            addressLine2: e.target.value
                        })}
                        disabled={disabled}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg 
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                                 disabled:bg-gray-100 disabled:cursor-not-allowed
                                 hover:border-gray-400"
                    />
                </div>
            </div>

            {/* Address Preview */}
            {(value.addressLine1 || value.location.city) && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Address Preview:</p>
                    <div className="text-sm text-gray-700">
                        {value.addressLine1 && <p>{value.addressLine1}</p>}
                        {value.addressLine2 && <p>{value.addressLine2}</p>}
                        <p>
                            {[
                                value.location.cityName,
                                value.location.stateName,
                                value.location.zipCode
                            ].filter(Boolean).join(', ')}
                        </p>
                        {value.location.countryName && <p className="font-medium">{value.location.countryName}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressForm;
