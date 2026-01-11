// Geocoding controller - proxies Nominatim API requests to avoid CORS issues

/**
 * Reverse geocoding - get address from coordinates
 * GET /api/geocoding/reverse?lat=21.2406892&lon=72.851219&zoom=18&addressdetails=1
 */
export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lon, zoom = 18, addressdetails = 1 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=${zoom}&addressdetails=${addressdetails}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Print24-Geocoding-Service/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch geocoding data',
        status: response.status 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

/**
 * Forward geocoding - search by postalcode/address
 * GET /api/geocoding/search?postalcode=395001&country=India&limit=1
 */
export const searchGeocode = async (req, res) => {
  try {
    const { postalcode, country, limit = 1, q } = req.query;

    if (!postalcode && !q) {
      return res.status(400).json({ error: 'Postalcode or query (q) is required' });
    }

    let nominatimUrl = 'https://nominatim.openstreetmap.org/search?format=json';
    
    if (postalcode) {
      nominatimUrl += `&postalcode=${encodeURIComponent(postalcode)}`;
    }
    if (q) {
      nominatimUrl += `&q=${encodeURIComponent(q)}`;
    }
    if (country) {
      nominatimUrl += `&country=${encodeURIComponent(country)}`;
    }
    if (limit) {
      nominatimUrl += `&limit=${limit}`;
    }

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Print24-Geocoding-Service/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch geocoding data',
        status: response.status 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Geocoding search error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
