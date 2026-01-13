# Location Autocomplete - Modular Architecture

## Overview

This feature provides intelligent location autocomplete for Geo Zone creation with three phases:
1. **Phase 1**: Basic autocomplete from pre-loaded database
2. **Phase 2**: Existing zone detection and conflict handling
3. **Phase 3**: Smart region suggestions (e.g., "West India")

---

## File Structure

```
server/
├── src/
│   ├── services/
│   │   ├── LocationService.js              # Core location database operations
│   │   └── RegionSuggestionsService.js     # Smart region combinations
│   ├── controllers/
│   │   └── admin/
│   │       └── locationSearchController.js # API endpoints for location search
│   ├── routes/
│   │   └── admin/
│   │       └── pricingAdminRoutes.js       # Routes (updated with location endpoints)
│   └── data/
│       └── india-locations.json            # Pre-loaded location database
│
client/
├── components/
│   └── admin/
│       └── pricing/
│           ├── GeoZoneManager.tsx          # Main component (to be updated)
│           └── LocationAutocomplete.tsx    # Autocomplete UI component
├── hooks/
│   └── useLocationSearch.ts                # Custom hook for search logic
└── utils/
    └── locationUtils.ts                    # Helper utilities
```

---

## Backend Modules

### 1. LocationService.js

**Purpose**: Core service for location database operations

**Methods**:
- `loadLocations()` - Load and cache location database
- `getAllLocations()` - Get all states and UTs
- `searchLocations(query, limit)` - Search by name or code
- `getLocationByName(name)` - Get specific location
- `getLocationsByNames(names)` - Get multiple locations
- `clearCache()` - Clear cache for testing

**Usage**:
```javascript
import LocationService from '../../services/LocationService.js';

const results = LocationService.searchLocations('maharashtra');
const location = LocationService.getLocationByName('GUJARAT');
```

---

### 2. RegionSuggestionsService.js

**Purpose**: Provides smart region combinations

**Predefined Regions**:
- West India (Gujarat, Maharashtra, Goa)
- North India (Delhi, Haryana, Punjab, HP, Uttarakhand)
- South India (Karnataka, TN, Kerala, AP, Telangana)
- East India (West Bengal, Odisha, Bihar, Jharkhand)
- Northeast India (All 8 states)
- Central India (MP, Chhattisgarh)

**Methods**:
- `getSuggestion(query)` - Get region suggestion with merged pincode ranges
- `getAllRegions()` - List all available regions
- `addCustomRegion(key, data)` - Add custom region combination

**Usage**:
```javascript
import RegionSuggestionsService from '../../services/RegionSuggestionsService.js';

const suggestion = RegionSuggestionsService.getSuggestion('west india');
// Returns: { name, code, pincodeRanges: [...], statesIncluded: [...] }
```

---

### 3. locationSearchController.js

**Purpose**: API endpoint controllers

**Endpoints**:
- `GET /api/admin/pricing/locations/search?query=maharashtra`
- `GET /api/admin/pricing/locations/suggest-region?query=west india`
- `GET /api/admin/pricing/locations/regions`
- `GET /api/admin/pricing/locations/by-name/:name`

**Methods**:
- `searchLocations(req, res)` - Search locations
- `getRegionSuggestion(req, res)` - Get smart suggestion
- `getAllRegions(req, res)` - List all regions
- `getLocationByName(req, res)` - Get specific location

---

## Frontend Modules

### 4. useLocationSearch.ts (Custom Hook)

**Purpose**: Manages location search state and logic

**State**:
- `locationSearch` - Current search query
- `locationSuggestions` - Array of suggestions
- `showSuggestions` - Dropdown visibility
- `isLoading` - Loading state

**Methods**:
- `handleSearchChange(value)` - Handle input change
- `clearSearch()` - Clear search
- `closeSuggestions()` - Close dropdown
- `openSuggestions()` - Open dropdown

**Usage**:
```tsx
import { useLocationSearch } from '../../../hooks/useLocationSearch';

const {
    locationSearch,
    locationSuggestions,
    showSuggestions,
    handleSearchChange,
    clearSearch
} = useLocationSearch(geoZones);
```

---

### 5. LocationAutocomplete.tsx (Component)

**Purpose**: Reusable autocomplete UI component

**Props**:
- `locationSearch` - Search query
- `locationSuggestions` - Suggestions array
- `showSuggestions` - Show/hide dropdown
- `isLoading` - Loading state
- `onSearchChange` - Search change handler
- `onSelectLocation` - Selection handler
- `onFocus` - Focus handler
- `onClose` - Close handler

**Features**:
- Visual distinction for different sources (database, existing, smart)
- Loading spinner
- Empty state
- Click-outside-to-close

**Usage**:
```tsx
import { LocationAutocomplete } from './LocationAutocomplete';

<LocationAutocomplete
    locationSearch={locationSearch}
    locationSuggestions={locationSuggestions}
    showSuggestions={showSuggestions}
    isLoading={isLoading}
    onSearchChange={handleSearchChange}
    onSelectLocation={handleSelectLocation}
    onFocus={openSuggestions}
    onClose={closeSuggestions}
/>
```

---

### 6. locationUtils.ts (Utilities)

**Purpose**: Helper functions for location handling

**Functions**:
- `findExistingZone(name, zones)` - Check for duplicates
- `handleLocationSelection(location, zones, onEdit)` - Conflict resolution
- `formatLocationForForm(location)` - Format for form data
- `validateLocationData(data)` - Validate location data
- `mergePincodeRanges(ranges)` - Merge overlapping ranges

**Usage**:
```tsx
import { handleLocationSelection } from '../../../utils/locationUtils';

const result = handleLocationSelection(location, geoZones, handleEdit);
if (result.action === 'create') {
    setFormData(result.data);
}
```

---

## Integration with GeoZoneManager.tsx

### Step 1: Import modules
```tsx
import { useLocationSearch } from '../../../hooks/useLocationSearch';
import { LocationAutocomplete } from './LocationAutocomplete';
import { handleLocationSelection } from '../../../utils/locationUtils';
```

### Step 2: Use the hook
```tsx
const {
    locationSearch,
    locationSuggestions,
    showSuggestions,
    isLoading,
    handleSearchChange,
    clearSearch,
    closeSuggestions,
    openSuggestions
} = useLocationSearch(geoZones);
```

### Step 3: Add component to modal
```tsx
<LocationAutocomplete
    locationSearch={locationSearch}
    locationSuggestions={locationSuggestions}
    showSuggestions={showSuggestions}
    isLoading={isLoading}
    onSearchChange={handleSearchChange}
    onSelectLocation={handleSelectLocation}
    onFocus={openSuggestions}
    onClose={closeSuggestions}
/>
```

### Step 4: Handle selection
```tsx
const handleSelectLocation = (location) => {
    const result = handleLocationSelection(location, geoZones, handleEdit);
    
    if (result.action === 'create' || result.action === 'create-custom') {
        setFormData({ ...formData, ...result.data });
    }
    
    clearSearch();
};
```

---

## Testing Each Module

### Backend Testing

**LocationService**:
```bash
# Test search
curl "http://localhost:5000/api/admin/pricing/locations/search?query=maharashtra"

# Test by name
curl "http://localhost:5000/api/admin/pricing/locations/by-name/GUJARAT"
```

**RegionSuggestionsService**:
```bash
# Test smart suggestion
curl "http://localhost:5000/api/admin/pricing/locations/suggest-region?query=west india"

# List all regions
curl "http://localhost:5000/api/admin/pricing/locations/regions"
```

### Frontend Testing

**useLocationSearch Hook**:
- Type "Maharashtra" → Should show database result
- Type "West India" → Should show smart suggestion
- Type existing zone name → Should show existing zone

**LocationAutocomplete Component**:
- Visual distinction: Database (blue), Existing (green), Smart (purple)
- Loading spinner appears during search
- Click outside closes dropdown

**locationUtils**:
- Duplicate detection works
- Conflict resolution prompts correctly
- Pincode range merging works

---

## Debugging Guide

### Issue: Location search returns empty

**Check**:
1. Is `india-locations.json` in `server/data/`?
2. Run: `LocationService.clearCache()` and retry
3. Check server logs for errors

### Issue: Smart suggestions not working

**Check**:
1. Query must be exact: "west india", "north india" (lowercase)
2. Check `RegionSuggestionsService.getAllRegions()` for available regions
3. Verify states exist in database

### Issue: Existing zones not showing

**Check**:
1. Ensure `geoZones` array is passed to `useLocationSearch(geoZones)`
2. Check zone names match (case-insensitive)

### Issue: Pincode ranges not auto-filling

**Check**:
1. Verify location has `pincodeRanges` in database
2. Check `formatLocationForForm()` is called
3. Ensure form field is bound to `formData.pincodeRanges`

---

## Extending the System

### Add New Region

**File**: `server/src/services/RegionSuggestionsService.js`

```javascript
this.regionCombinations['custom region'] = {
    name: 'Custom Region Name',
    level: 'REGION',
    states: ['STATE1', 'STATE2'],
    description: 'Description here'
};
```

### Add New Location Source

1. Update `LocationService.js` to add new data source
2. Update `source` type in `LocationAutocomplete.tsx`
3. Add visual styling for new source type

### Add Validation Rules

**File**: `client/utils/locationUtils.ts`

```typescript
export const validateLocationData = (data: any) => {
    // Add custom validation rules
    if (data.pincodeRanges.length > 10) {
        errors.push('Maximum 10 pincode ranges allowed');
    }
    return { valid, errors };
};
```

---

## Performance Considerations

1. **Caching**: LocationService caches database in memory
2. **Debouncing**: Consider adding debounce to search (currently immediate)
3. **Pagination**: Limit results to 10 (configurable)
4. **Lazy Loading**: Database loaded on first request

---

## Future Enhancements

- [ ] Add district-level autocomplete
- [ ] Support international locations (Google Places API)
- [ ] Add pincode validation against database
- [ ] Export/import custom region definitions
- [ ] Add search history
- [ ] Support fuzzy matching
