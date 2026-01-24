import React, { useState } from 'react';
import './PincodeSelector.css';

/**
 * PincodeSelector Component
 * 
 * Allows users to change their delivery pincode which updates all prices
 */
const PincodeSelector = ({ 
  onPincodeChange,
  showCurrentLocation = true,
  compact = false 
}) => {
  const [inputPincode, setInputPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPincode, setCurrentPincode] = useState(localStorage.getItem('pincode') || null);
  const [geoZone, setGeoZone] = useState(null);

  const validateAndUpdatePincode = async (pincode) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate pincode format
      if (!/^\d{6}$/.test(pincode)) {
        throw new Error('Please enter a valid 6-digit pincode');
      }

      // Update localStorage
      localStorage.setItem('pincode', pincode);
      setCurrentPincode(pincode);

      // Get geo zone info (optional - for display)
      try {
        const token = localStorage.getItem('authToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch(`/api/pricing/my-context?pincode=${pincode}`, {
          headers
        });
        const data = await response.json();
        
        if (data.success && data.context?.geoZone) {
          setGeoZone(data.context.geoZone);
        }
      } catch (err) {
        // Geo zone fetch failed, but pincode is still valid
        console.log('Could not fetch geo zone info');
      }

      // Notify parent component
      if (onPincodeChange) {
        onPincodeChange(pincode);
      }

      // Clear input
      setInputPincode('');
      setError(null);
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputPincode.trim()) return;
    
    await validateAndUpdatePincode(inputPincode);
  };

  const handleDetectLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to detect location from IP
      // This is a placeholder - you can implement actual IP-based detection
      const defaultPincode = '560001'; // Default to Bangalore
      await validateAndUpdatePincode(defaultPincode);
    } catch (err) {
      setError('Could not detect location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`pincode-selector ${compact ? 'compact' : ''}`}>
      {!compact && showCurrentLocation && currentPincode && (
        <div className="current-location">
          <span className="location-icon">📍</span>
          <span className="location-text">
            Delivering to <strong>{currentPincode}</strong>
            {geoZone && ` - ${geoZone.name}`}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pincode-form">
        <div className="input-group">
          <input
            type="text"
            value={inputPincode}
            onChange={(e) => {
              setInputPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            placeholder="Enter pincode"
            maxLength={6}
            className={`pincode-input ${error ? 'error' : ''}`}
            disabled={loading}
          />
          
          <button 
            type="submit" 
            className="pincode-submit"
            disabled={loading || !inputPincode || inputPincode.length !== 6}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              compact ? 'Update' : 'Check'
            )}
          </button>
        </div>

        {!compact && (
          <button 
            type="button" 
            className="detect-location-btn"
            onClick={handleDetectLocation}
            disabled={loading}
          >
            📍 Use my location
          </button>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {!compact && currentPincode && !error && (
          <div className="pincode-hint">
            💡 Changing pincode will update all prices on this page
          </div>
        )}
      </form>

      {/* Serviceability Info */}
      {!compact && (
        <div className="serviceability-info">
          <details>
            <summary>Delivery Information</summary>
            <div className="serviceability-content">
              <p>We deliver to most pincodes across India</p>
              <ul>
                <li>✓ Standard delivery: 3-5 business days</li>
                <li>✓ Express delivery: 1-2 business days (metro cities)</li>
                <li>✓ Free shipping on orders above ₹5000</li>
              </ul>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default PincodeSelector;
