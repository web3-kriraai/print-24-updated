# Pincode Data Processing Script

## Purpose
Converts India Post pincode CSV data into a structured JSON file for location autocomplete feature.

## Usage

1. **Place your CSV file** in this directory:
   ```
   server/scripts/pincode-data.csv
   ```

2. **Run the script**:
   ```bash
   cd server/scripts
   node process-pincode-data.js
   ```

   Or specify custom CSV path:
   ```bash
   node process-pincode-data.js /path/to/your/pincode-data.csv
   ```

3. **Output**: 
   - File: `server/data/india-locations.json`
   - Contains all Indian states and UTs with pincode ranges

## CSV Format Expected

The script expects these columns:
- `circlename`
- `regionname`
- `divisionname`
- `officename`
- `pincode`
- `officetype`
- `delivery`
- `district`
- `statename`
- `latitude`
- `longitude`

## Output Format

```json
{
  "states": [
    {
      "name": "Maharashtra",
      "code": "MH",
      "level": "STATE",
      "pincodeRanges": [
        { "start": 400000, "end": 449999 }
      ],
      "currency": "INR",
      "districtCount": 36
    }
  ],
  "unionTerritories": [
    {
      "name": "Delhi",
      "code": "DL",
      "level": "UT",
      "pincodeRanges": [
        { "start": 110001, "end": 110097 }
      ],
      "currency": "INR",
      "districtCount": 11
    }
  ]
}
```

## Next Steps

After generating the JSON file:
1. The backend API will automatically use it for location search
2. Frontend autocomplete will show these locations
3. Users can search and auto-fill geo zone data
