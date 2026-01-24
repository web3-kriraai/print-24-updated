import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching dynamic pricing for a single product
 * 
 * @param {String} productId - Product ID
 * @param {Object} options - Configuration options
 * @returns {Object} { price, loading, error, refetch, updatePincode }
 */
export const useDynamicPricing = (productId, options = {}) => {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    quantity = 1,
    selectedDynamicAttributes = [],
    pincode = null,
    userPreferredCurrency = null, // NEW: For currency conversion
    skip = false
  } = options;

  const fetchPrice = useCallback(async (customPincode) => {
    if (!productId || skip) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');

      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = {
        productId,
        quantity,
        selectedDynamicAttributes,
        pincode: customPincode || (() => {
          // Try to get from detected location object (LocationDetector)
          try {
            const storedLoc = localStorage.getItem('userLocation');
            if (storedLoc) return JSON.parse(storedLoc).pincode;
          } catch (e) {
            console.warn('Error parsing userLocation:', e);
          }
          // Fallback to legacy key
          return localStorage.getItem('pincode');
        })(),
        userPreferredCurrency: userPreferredCurrency || localStorage.getItem('preferredCurrency') // NEW
      };

      const response = await fetch('/api/pricing/quote', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }

      const data = await response.json();

      if (data.success) {
        setPrice(data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch price');
        setPrice(null);
      }
    } catch (err) {
      console.error('useDynamicPricing error:', err);
      setError(err.message);
      setPrice(null);
    } finally {
      setLoading(false);
    }
  }, [productId, quantity, JSON.stringify(selectedDynamicAttributes), pincode, userPreferredCurrency, skip]);

  const refetch = useCallback((newPincode) => {
    fetchPrice(newPincode);
  }, [fetchPrice]);

  const updatePincode = useCallback((newPincode) => {
    localStorage.setItem('pincode', newPincode);
    refetch(newPincode);
  }, [refetch]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  return {
    price,
    loading,
    error,
    refetch,
    updatePincode
  };
};

/**
 * Custom hook for batch pricing (product listings)
 * 
 * @param {Array} productIds - Array of product IDs
 * @param {Object} options - Configuration options
 * @returns {Object} { prices, loading, error, getPrice }
 */
export const useBatchDynamicPricing = (productIds, options = {}) => {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    quantity = 1,
    pincode = null,
    skip = false
  } = options;

  useEffect(() => {
    if (!productIds?.length || skip) {
      setLoading(false);
      return;
    }

    const fetchBatchPrices = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('authToken');

        const headers = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/pricing/batch-quote', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productIds,
            pincode: pincode || (() => {
              try {
                const storedLoc = localStorage.getItem('userLocation');
                if (storedLoc) return JSON.parse(storedLoc).pincode;
              } catch (e) { }
              return localStorage.getItem('pincode');
            })(),
            quantity
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch batch prices');
        }

        const data = await response.json();

        if (data.success) {
          // Convert array to object for easy lookup
          const priceMap = {};
          data.prices?.forEach(result => {
            priceMap[result.productId] = result;
          });
          setPrices(priceMap);
          setError(null);
        } else {
          setError(data.message || 'Failed to fetch batch prices');
          setPrices({});
        }
      } catch (err) {
        console.error('useBatchDynamicPricing error:', err);
        setError(err.message);
        setPrices({});
      } finally {
        setLoading(false);
      }
    };

    fetchBatchPrices();
  }, [JSON.stringify(productIds), quantity, pincode, skip]);

  const getPrice = useCallback((productId) => {
    return prices[productId];
  }, [prices]);

  return {
    prices,
    loading,
    error,
    getPrice
  };
};

export default useDynamicPricing;
