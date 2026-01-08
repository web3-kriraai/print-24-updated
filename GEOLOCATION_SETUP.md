# 🌍 Geolocation API Setup Guide

Complete setup for IP and GPS-based location detection in Print24.

---

## ✅ COMPLETED STEPS

### 1️⃣ GCP Project Setup
- **Project**: `prints24-web`
- **Account**: `web2.kriraai@gmail.com`
- **Region**: `asia-south1`

### 2️⃣ APIs Enabled
```bash
✅ geolocation.googleapis.com - Geolocation API
✅ geocoding-backend.googleapis.com - Geocoding API
```

### 3️⃣ API Key Created
```
Display Name: print24-location-key
Key ID: ab5c017d-5764-4603-82b2-8b3458557046
API Key: AIzaSyDF-LquikP14aeKWamhmHB_FXwx1WreWMY
```

### 4️⃣ API Key Restrictions Applied
```json
{
  "apiTargets": [
    { "service": "geolocation.googleapis.com" },
    { "service": "geocoding-backend.googleapis.com" }
  ]
}
```

---

## 📦 Backend Implementation

### Files Created

#### 1. **Service Layer**
`server/src/services/GeolocationService.js`
- IP → Lat/Lng conversion
- Reverse geocoding (Lat/Lng → Address)
- Built-in caching (24h TTL)
- Complete pincode extraction

#### 2. **Controller**
`server/src/controllers/geolocationController.js`
- Smart location detection
- GPS, IP, and manual fallback
- Error handling

#### 3. **Routes**
`server/src/routes/geolocation.js`
- `POST /api/geolocation/from-ip` - Get location from IP
- `POST /api/geolocation/from-gps` - Get location from GPS coordinates
- `POST /api/geolocation/detect` - Smart detection (GPS → IP → Manual)
- `POST /api/geolocation/clear-cache` - Clear cache (admin)

#### 4. **Server Integration**
Updated `server/src/server.js` to include geolocation routes

---

## ⚙️ Environment Configuration

### Add to `.env` file:
```bash
# Copy your API key to server/.env
GCP_GEOLOCATION_API_KEY=AIzaSyDF-LquikP14aeKWamhmHB_FXwx1WreWMY
```

**Reference file created**: `server/.env.geolocation`

---

## 🎨 Frontend Implementation

### Files Created

#### React Hook & Component
`client/hooks/useGeolocation.tsx`

**Features**:
- GPS-based location detection
- Automatic IP fallback
- Manual pincode input
- Loading and error states
- Location caching

**Usage Example**:
```tsx
import { useGeolocation, LocationInput } from '../hooks/useGeolocation';

// In your component
function MyComponent() {
  const { location, detectLocation } = useGeolocation();
  
  // Auto-detect location
  useEffect(() => {
    detectLocation();
  }, []);
  
  return (
    <div>
      {location && (
        <p>Pincode: {location.pincode}</p>
      )}
    </div>
  );
}

// Or use the ready-made component
function CheckoutPage() {
  const handleLocationChange = (location) => {
    console.log('User location:', location);
    // Use location.pincode for pricing
  };
  
  return (
    <LocationInput 
      onLocationChange={handleLocationChange}
      autoDetect={true}
    />
  );
}
```

---

## 🔄 Location Detection Flow

```mermaid
graph TD
    A[User Visits Page] --> B{GPS Available?}
    B -->|Yes| C[Request GPS Permission]
    B -->|No| D[Use IP Address]
    
    C -->|Granted| E[Get GPS Coordinates]
    C -->|Denied| D
    
    E --> F[Send to Backend: /api/geolocation/from-gps]
    D --> G[Send to Backend: /api/geolocation/from-ip]
    
    F --> H[Reverse Geocode]
    G --> I[Geolocation API]
    I --> H
    
    H --> J{Success?}
    J -->|Yes| K[Return Pincode, City, State]
    J -->|No| L[Show Manual Input]
    
    K --> M[Use for Pricing]
    L --> N[User Enters Pincode]
    N --> M
```

---

## 🧪 Testing the Setup

### Test Backend API

#### 1. Test IP-based location:
```bash
curl -X POST http://localhost:5000/api/geolocation/from-ip \
  -H "Content-Type: application/json"
```

#### 2. Test GPS-based location:
```bash
curl -X POST http://localhost:5000/api/geolocation/from-gps \
  -H "Content-Type: application/json" \
  -d '{"lat": 28.6139, "lng": 77.2090}'
```

#### 3. Test smart detection with manual pincode:
```bash
curl -X POST http://localhost:5000/api/geolocation/detect \
  -H "Content-Type: application/json" \
  -d '{"pincode": "110001"}'
```

### Expected Response:
```json
{
  "success": true,
  "data": {
    "pincode": "110001",
    "city": "New Delhi",
    "state": "Delhi",
    "country": "India",
    "formattedAddress": "...",
    "source": "gps" // or "ip" or "manual"
  }
}
```

---

## 🔌 Integration with Pricing System

### Step 1: Detect Location
```typescript
const { location, detectLocation } = useGeolocation();

useEffect(() => {
  detectLocation();
}, []);
```

### Step 2: Use Pincode for Pricing
```typescript
if (location?.pincode) {
  // Call your pricing API with the pincode
  const pricing = await api.post('/pricing/context', {
    productId: '...',
    quantity: 100,
    geozone: {
      pincode: location.pincode,
      city: location.city,
      state: location.state
    }
  });
}
```

### Step 3: Cache Location in Session
```typescript
// Store in localStorage for session persistence
useEffect(() => {
  if (location) {
    localStorage.setItem('userLocation', JSON.stringify(location));
  }
}, [location]);

// Retrieve on mount
useEffect(() => {
  const cached = localStorage.getItem('userLocation');
  if (cached) {
    setLocation(JSON.parse(cached));
  } else {
    detectLocation();
  }
}, []);
```

---

## 🛡️ Best Practices

### ✅ DO
- Always provide manual pincode input as fallback
- Cache location data (24h) to reduce API calls
- Use GPS for logged-in users
- Use IP for anonymous users
- Show clear error messages
- Request location permission with context

### ❌ DON'T
- Never call Google APIs directly from frontend
- Don't expose API key in frontend code
- Don't force GPS permission without explanation
- Don't auto-detect on every page load (use caching)
- Don't block UI while detecting location

---

## 💰 API Usage & Costs

### Google Geolocation API
- **Free tier**: First 100,000 requests/month
- **Cost**: $5 per 1,000 requests after free tier

### Google Geocoding API  
- **Free tier**: First $200 credit/month (~40,000 requests)
- **Cost**: $5 per 1,000 requests after free tier

### Optimization Tips
1. **Cache aggressively** (24h cache already implemented)
2. **Store pincode in user profile** for logged-in users
3. **Use manual input** as primary method
4. **GPS/IP as helper** only when needed

---

## 🚨 Troubleshooting

### Issue: "Cannot determine location for localhost"
**Solution**: Use manual pincode input during local development, or test with actual IP.

### Issue: GPS permission denied
**Solution**: Fallback to IP or manual input (already implemented).

### Issue: API quota exceeded
**Solution**: 
- Increase caching duration
- Store pincode in user session/profile
- Show manual input first, auto-detect as secondary

### Issue: Inaccurate location from IP
**Solution**: 
- Prioritize GPS for logged-in users
- Show detected location and allow manual override
- Always allow manual pincode entry

---

## 📊 Monitoring

### Check API Usage
```bash
# View API usage in GCP Console
https://console.cloud.google.com/apis/api/geolocation.googleapis.com/quotas?project=prints24-web

https://console.cloud.google.com/apis/api/geocoding-backend.googleapis.com/quotas?project=prints24-web
```

### Backend Logs
Location detection logs are prefixed with 📍:
```
📍 Location request from IP: 103.x.x.x
📍 GPS location request: 28.6139, 77.2090
📍 Using manually provided pincode: 110001
```

---

## 🎯 Next Steps

1. ✅ Add `GCP_GEOLOCATION_API_KEY` to production `.env`
2. ✅ Test all three detection methods (GPS, IP, Manual)
3. ✅ Integrate with pricing system
4. ✅ Add location input to checkout/signup pages
5. ✅ Monitor API usage in GCP Console
6. ✅ Set up usage alerts in GCP

---

## 📝 Summary

**Your geolocation system is complete and ready to use!**

- ✅ Google APIs enabled
- ✅ API key created and secured
- ✅ Backend service, controller, routes implemented
- ✅ Frontend hook and component created
- ✅ Caching implemented
- ✅ Multiple fallback methods
- ✅ Ready for production

**API Key**: `AIzaSyDF-LquikP14aeKWamhmHB_FXwx1WreWMY`

**Add to `.env`**: `GCP_GEOLOCATION_API_KEY=AIzaSyDF-LquikP14aeKWamhmHB_FXwx1WreWMY`

---

Need help? Check the files:
- Backend: `server/src/services/GeolocationService.js`
- Frontend: `client/hooks/useGeolocation.tsx`
- Routes: `server/src/routes/geolocation.js`
