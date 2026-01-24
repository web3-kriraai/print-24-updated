/**
 * Enhanced Pincode Data Processor - WITH DISTRICT SUPPORT
 * Processes India Post CSV to generate location database with:
 * - States (28)
 * - Union Territories (8)
 * - Districts (~700+)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// State code mapping (ISO 3166-2:IN)
const STATE_CODES = {
    'ANDHRA PRADESH': 'AP',
    'ARUNACHAL PRADESH': 'AR',
    'ASSAM': 'AS',
    'BIHAR': 'BR',
    'CHHATTISGARH': 'CG',
    'GOA': 'GA',
    'GUJARAT': 'GJ',
    'HARYANA': 'HR',
    'HIMACHAL PRADESH': 'HP',
    'JHARKHAND': 'JH',
    'KARNATAKA': 'KA',
    'KERALA': 'KL',
    'MADHYA PRADESH': 'MP',
    'MAHARASHTRA': 'MH',
    'MANIPUR': 'MN',
    'MEGHALAYA': 'ML',
    'MIZORAM': 'MZ',
    'NAGALAND': 'NL',
    'ODISHA': 'OR',
    'PUNJAB': 'PB',
    'RAJASTHAN': 'RJ',
    'SIKKIM': 'SK',
    'TAMIL NADU': 'TN',
    'TELANGANA': 'TG',
    'TRIPURA': 'TR',
    'UTTAR PRADESH': 'UP',
    'UTTARAKHAND': 'UK',
    'WEST BENGAL': 'WB',
    // Union Territories
    'ANDAMAN AND NICOBAR ISLANDS': 'AN',
    'CHANDIGARH': 'CH',
    'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'DH',
    'THE DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'DH',
    'DELHI': 'DL',
    'JAMMU AND KASHMIR': 'JK',
    'LADAKH': 'LA',
    'LAKSHADWEEP': 'LD',
    'PUDUCHERRY': 'PY'
};

const UNION_TERRITORIES = [
    'ANDAMAN AND NICOBAR ISLANDS',
    'CHANDIGARH',
    'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
    'THE DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
    'DELHI',
    'JAMMU AND KASHMIR',
    'LADAKH',
    'LAKSHADWEEP',
    'PUDUCHERRY'
];

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(filePath) {
    console.log('📂 Reading CSV file...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }

    console.log(`✅ Parsed ${data.length} records`);
    return data;
}

function processData(data) {
    console.log('🔄 Processing pincode data...');

    const stateMap = new Map();
    const districtMap = new Map();
    let skipped = 0;

    data.forEach(row => {
        const stateName = row.statename?.toUpperCase().trim();
        const districtName = row.district?.toUpperCase().trim();
        const pincode = parseInt(row.pincode);

        // Skip invalid data
        if (!stateName || stateName === 'NA' || isNaN(pincode)) {
            skipped++;
            return;
        }

        // Process state
        if (!stateMap.has(stateName)) {
            stateMap.set(stateName, {
                name: stateName,
                code: STATE_CODES[stateName] || stateName.substring(0, 2).toUpperCase(),
                level: UNION_TERRITORIES.includes(stateName) ? 'UT' : 'STATE',
                pincodes: [],
                districts: new Set()
            });
        }

        const state = stateMap.get(stateName);
        state.pincodes.push(pincode);

        // Process district
        if (districtName && districtName !== 'NA') {
            state.districts.add(districtName);

            const districtKey = `${stateName}::${districtName}`;
            if (!districtMap.has(districtKey)) {
                districtMap.set(districtKey, {
                    name: districtName,
                    stateName: stateName,
                    stateCode: STATE_CODES[stateName] || stateName.substring(0, 2).toUpperCase(),
                    code: districtName.substring(0, 4).toUpperCase(),
                    level: 'DISTRICT',
                    pincodes: []
                });
            }

            districtMap.get(districtKey).pincodes.push(pincode);
        }
    });

    console.log(`✅ Found ${stateMap.size} states/UTs`);
    console.log(`✅ Found ${districtMap.size} districts`);
    console.log(`⚠️  Skipped ${skipped} invalid records`);

    return { stateMap, districtMap };
}

function calculateRanges(pincodes) {
    if (pincodes.length === 0) return [];

    // Sort and remove duplicates
    pincodes = [...new Set(pincodes)].sort((a, b) => a - b);

    const ranges = [];
    let start = pincodes[0];
    let end = pincodes[0];

    for (let i = 1; i < pincodes.length; i++) {
        if (pincodes[i] - end <= 100) {
            end = pincodes[i];
        } else {
            ranges.push({ start, end });
            start = pincodes[i];
            end = pincodes[i];
        }
    }
    ranges.push({ start, end });

    // Merge overlapping ranges
    const merged = [];
    for (const range of ranges) {
        if (merged.length === 0) {
            merged.push(range);
        } else {
            const last = merged[merged.length - 1];
            if (range.start <= last.end + 1000) {
                last.end = Math.max(last.end, range.end);
            } else {
                merged.push(range);
            }
        }
    }

    return merged;
}

function generateOutput(stateMap, districtMap) {
    console.log('📝 Generating output JSON...');

    const states = [];
    const unionTerritories = [];
    const districts = [];

    // Process states/UTs
    stateMap.forEach((state) => {
        const ranges = calculateRanges(state.pincodes);

        const location = {
            name: state.name,
            code: state.code,
            level: state.level,
            pincodeRanges: ranges,
            currency: 'INR',
            districtCount: state.districts.size
        };

        if (state.level === 'UT') {
            unionTerritories.push(location);
        } else {
            states.push(location);
        }
    });

    // Process districts
    districtMap.forEach((district) => {
        const ranges = calculateRanges(district.pincodes);

        districts.push({
            name: district.name,
            stateName: district.stateName,
            stateCode: district.stateCode,
            code: district.code,
            level: district.level,
            pincodeRanges: ranges,
            currency: 'INR'
        });
    });

    // Sort alphabetically
    states.sort((a, b) => a.name.localeCompare(b.name));
    unionTerritories.sort((a, b) => a.name.localeCompare(b.name));
    districts.sort((a, b) => {
        // Sort by state first, then district
        if (a.stateName !== b.stateName) {
            return a.stateName.localeCompare(b.stateName);
        }
        return a.name.localeCompare(b.name);
    });

    return { states, unionTerritories, districts };
}

function main() {
    console.log('🚀 Starting enhanced pincode data processing...\n');

    const csvPath = process.argv[2] || path.join(__dirname, 'pincode-data.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Error: CSV file not found at ${csvPath}`);
        process.exit(1);
    }

    try {
        // Parse CSV
        const data = parseCSV(csvPath);

        // Process data
        const { stateMap, districtMap } = processData(data);

        // Generate output
        const output = generateOutput(stateMap, districtMap);

        // Write to file
        const outputPath = path.join(__dirname, '../data/india-locations-with-districts.json');
        const outputDir = path.dirname(outputPath);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        console.log('\n✅ SUCCESS!');
        console.log(`📁 Output file: ${outputPath}`);
        console.log(`📊 States: ${output.states.length}`);
        console.log(`📊 Union Territories: ${output.unionTerritories.length}`);
        console.log(`📊 Districts: ${output.districts.length}`);
        console.log('\n🎉 Enhanced location database ready!');

        // Show sample district
        console.log('\n📋 Sample district data:');
        const sampleDistrict = output.districts.find(d => d.name.includes('PUNE')) || output.districts[0];
        console.log(JSON.stringify(sampleDistrict, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
