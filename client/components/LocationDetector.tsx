import React, { useState, useEffect } from 'react';
import { MapPin, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';

/**
 * LocationDetector Component
 * 
 * Smart location detection with PRIORITIZED fallback:
 * 1. Try IP detection first (fastest, works in production)
 * 2. Try GPS if IP fails (more accurate)
 * 3. Show manual input if both fail
 */

interface LocationData {
    pincode: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    lat?: number;
    lng?: number;
    source: 'gps' | 'ip' | 'manual';
}

interface LocationDetectorProps {
    onLocationDetected?: (location: LocationData) => void;
    showUI?: boolean;
    autoDetect?: boolean;
}

export const LocationDetector: React.FC<LocationDetectorProps> = ({
    onLocationDetected,
    showUI = true,
    autoDetect = true
}) => {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualPincode, setManualPincode] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [detectionStep, setDetectionStep] = useState<'idle' | 'gps' | 'ip' | 'manual'>('idle');

    // Auto-detect on mount if enabled
    useEffect(() => {
        if (autoDetect && !location) {
            detectLocation();
        }
    }, [autoDetect]);

    // Notify parent when location changes
    useEffect(() => {
        if (location && onLocationDetected) {
            onLocationDetected(location);

            // Store in localStorage for session persistence
            localStorage.setItem('userLocation', JSON.stringify(location));
        }
    }, [location, onLocationDetected]);

    /**
     * Main detection flow: IP → GPS → Manual
     */
    const detectLocation = async () => {
        setLoading(true);
        setError(null);

        // Step 1: Try IP detection FIRST
        setDetectionStep('ip');
        console.log('📍 Step 1: Trying IP-based location detection...');

        try {
            const response = await fetch(`${API_BASE_URL}/geolocation/from-ip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            // Check if we got a valid pincode
            if (response.ok && data.success && data.data && data.data.pincode) {
                const locationData: LocationData = {
                    ...data.data,
                    source: 'ip'
                };
                setLocation(locationData);
                setDetectionStep('idle');
                setLoading(false);
                console.log('✅ IP location detected:', locationData);
                return; // Success - exit
            }

            // IP failed - continue to GPS
            if (response.status === 400) {
                console.log('⚠️ IP detection unavailable (localhost/private IP) - trying GPS...');
            } else {
                console.log('⚠️ IP detection returned no pincode - trying GPS...');
            }
        } catch (ipError) {
            console.log('⚠️ IP detection error - trying GPS...');
        }

        // Step 2: IP failed, try GPS
        if (navigator.geolocation) {
            setDetectionStep('gps');
            console.log('📍 Step 2: Trying GPS location...');

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        console.log(`✅ GPS coordinates obtained: ${latitude}, ${longitude}`);

                        const response = await fetch(`${API_BASE_URL}/geolocation/from-gps`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                lat: latitude,
                                lng: longitude
                            })
                        });

                        const data = await response.json();

                        if (response.ok && data.success && data.data && data.data.pincode) {
                            const locationData: LocationData = {
                                ...data.data,
                                source: 'gps'
                            };
                            setLocation(locationData);
                            setDetectionStep('idle');
                            console.log('✅ GPS location detected:', locationData);
                        } else {
                            throw new Error(data.error || 'GPS reverse geocoding failed');
                        }
                    } catch (err: any) {
                        console.error('❌ GPS reverse geocoding failed:', err.message);
                        setError('Unable to detect your location automatically');
                        setShowManualInput(true);
                        setDetectionStep('manual');
                    } finally {
                        setLoading(false);
                    }
                },
                (gpsError) => {
                    console.log(`⚠️ GPS denied or unavailable (${gpsError.message})`);
                    setError('Unable to detect your location automatically');
                    setShowManualInput(true);
                    setDetectionStep('manual');
                    setLoading(false);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            // No GPS available
            console.log('📍 GPS not available');
            setError('Unable to detect your location automatically');
            setShowManualInput(true);
            setDetectionStep('manual');
            setLoading(false);
        }
    };

    /**
     * Manual pincode submission
     */
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!manualPincode || manualPincode.length !== 6) {
            setError('Please enter a valid 6-digit pincode');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/geolocation/detect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pincode: manualPincode
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const locationData: LocationData = {
                    ...data.data,
                    source: 'manual'
                };
                setLocation(locationData);
                setShowManualInput(false);
                console.log('✅ Manual pincode accepted:', locationData);
            } else {
                setError(data.error || 'Invalid pincode');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to validate pincode');
        } finally {
            setLoading(false);
        }
    };

    if (!showUI) {
        return null;
    }

    return (
        <div className="location-detector bg-linear-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-gray-200">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">📍 Your Location</h3>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center gap-2 py-2">
                    <Loader className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">
                        {detectionStep === 'ip' && 'Detecting from IP address...'}
                        {detectionStep === 'gps' && 'Getting GPS location...'}
                        {detectionStep === 'manual' && 'Validating pincode...'}
                        {detectionStep === 'idle' && 'Detecting location...'}
                    </span>
                </div>
            )}

            {/* Error State */}
            {error && !location && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded mb-3">
                    <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-yellow-800">{error}</p>
                        <p className="text-xs text-yellow-700 mt-1">Please enter your pincode below</p>
                    </div>
                </div>
            )}

            {/* Location Detected - NO CHANGE BUTTON */}
            {location && !showManualInput && (
                <div className="flex items-start gap-2 p-3 bg-white rounded border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">
                                {location.city && `${location.city}, `}
                                {location.state && `${location.state} - `}
                                <span className="text-blue-600">{location.pincode}</span>
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                {location.source === 'gps' && '📍 GPS'}
                                {location.source === 'ip' && '🌍 IP'}
                                {location.source === 'manual' && '✍️ Manual'}
                            </span>
                        </div>

                        {location.source === 'ip' && (
                            <p className="text-xs text-gray-500 mt-1">
                                Location detected from your IP address
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Manual Input Form */}
            {showManualInput && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                            Enter Pincode
                        </label>
                        <input
                            type="text"
                            id="pincode"
                            value={manualPincode}
                            onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit pincode"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            maxLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || manualPincode.length !== 6}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                        {loading ? 'Validating...' : 'Submit'}
                    </button>
                </form>
            )}

            {/* Info Box */}
            {!location && !loading && !error && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100">
                    <p className="text-xs text-blue-700">
                        💡 Detecting your location for accurate pricing...
                    </p>
                </div>
            )}
        </div>
    );
};

export default LocationDetector;
