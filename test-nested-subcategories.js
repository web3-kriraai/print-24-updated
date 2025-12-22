/**
 * Test Script for Nested Subcategory Feature
 * 
 * This script tests the nested subcategory API endpoints.
 * Run with: node test-nested-subcategories.js
 * 
 * Prerequisites:
 * - Server must be running
 * - Update API_BASE_URL below
 * - Have at least one category in the database
 */

const API_BASE_URL = 'http://localhost:5000/api'; // Update this to match your server URL

// Test configuration
const testConfig = {
  categoryId: null, // Will be set during test
  parentSubcategoryId: null,
  nestedSubcategoryId: null,
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Test functions
async function testGetCategories() {
  console.log('\n📋 Test 1: Get Categories');
  const result = await apiCall('/categories');

  if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
    testConfig.categoryId = result.data[0]._id;
    console.log('✅ Categories fetched successfully');
    console.log(`   Using category: ${result.data[0].name} (${testConfig.categoryId})`);
    return true;
  } else {
    console.log('❌ Failed to fetch categories');
    console.log('   Error:', result.error || result.data);
    return false;
  }
}

async function testGetSubcategoriesFlat() {
  console.log('\n📋 Test 2: Get Subcategories (Flat)');
  if (!testConfig.categoryId) {
    console.log('⏭️  Skipping - no category ID');
    return false;
  }

  const result = await apiCall(`/subcategories/category/${testConfig.categoryId}`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Fetched ${result.data.length} subcategories (flat)`);
    if (result.data.length > 0) {
      testConfig.parentSubcategoryId = result.data[0]._id;
      console.log(`   Using subcategory: ${result.data[0].name} (${testConfig.parentSubcategoryId})`);
    }
    return true;
  } else {
    console.log('❌ Failed to fetch subcategories');
    console.log('   Error:', result.error || result.data);
    return false;
  }
}

async function testGetSubcategoriesWithChildren() {
  console.log('\n📋 Test 3: Get Subcategories with Nested Children');
  if (!testConfig.categoryId) {
    console.log('⏭️  Skipping - no category ID');
    return false;
  }

  const result = await apiCall(`/subcategories/category/${testConfig.categoryId}?includeChildren=true`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Fetched subcategories with children structure`);

    // Check for nested structure
    const hasNested = result.data.some(sc => sc.children && sc.children.length > 0);
    if (hasNested) {
      console.log('   ✅ Found nested subcategories');
      const nestedCount = result.data.reduce((sum, sc) => {
        return sum + (sc.children ? sc.children.length : 0);
      }, 0);
      console.log(`   Total nested subcategories: ${nestedCount}`);
    } else {
      console.log('   ℹ️  No nested subcategories found (this is OK if none exist)');
    }

    return true;
  } else {
    console.log('❌ Failed to fetch subcategories with children');
    console.log('   Error:', result.error || result.data);
    return false;
  }
}

async function testGetNestedByParent() {
  console.log('\n📋 Test 4: Get Nested Subcategories by Parent');
  if (!testConfig.parentSubcategoryId) {
    console.log('⏭️  Skipping - no parent subcategory ID');
    return false;
  }

  const result = await apiCall(`/subcategories/parent/${testConfig.parentSubcategoryId}?includeChildren=true`);

  if (result.ok && Array.isArray(result.data)) {
    console.log(`✅ Fetched ${result.data.length} nested subcategories`);
    if (result.data.length > 0) {
      console.log(`   First nested: ${result.data[0].name}`);
    }
    return true;
  } else {
    console.log('❌ Failed to fetch nested subcategories');
    console.log('   Error:', result.error || result.data);
    return false;
  }
}

async function testGetSingleSubcategory() {
  console.log('\n📋 Test 5: Get Single Subcategory');
  if (!testConfig.parentSubcategoryId) {
    console.log('⏭️  Skipping - no subcategory ID');
    return false;
  }

  const result = await apiCall(`/subcategories/${testConfig.parentSubcategoryId}`);

  if (result.ok && result.data) {
    console.log(`✅ Fetched subcategory: ${result.data.name}`);
    if (result.data.parent) {
      console.log(`   Has parent: ${typeof result.data.parent === 'object' ? result.data.parent.name : 'Yes'}`);
    }
    if (result.data.category) {
      console.log(`   Category: ${typeof result.data.category === 'object' ? result.data.category.name : 'Yes'}`);
    }
    return true;
  } else {
    console.log('❌ Failed to fetch subcategory');
    console.log('   Error:', result.error || result.data);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Nested Subcategory API Tests\n');
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Run tests
  const tests = [
    { name: 'Get Categories', fn: testGetCategories },
    { name: 'Get Subcategories (Flat)', fn: testGetSubcategoriesFlat },
    { name: 'Get Subcategories with Children', fn: testGetSubcategoriesWithChildren },
    { name: 'Get Nested by Parent', fn: testGetNestedByParent },
    { name: 'Get Single Subcategory', fn: testGetSingleSubcategory },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" threw an error:`, error.message);
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📈 Total: ${results.passed + results.failed + results.skipped}`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ or a fetch polyfill');
  console.error('   Install node-fetch: npm install node-fetch');
  console.error('   Then add: import fetch from "node-fetch";');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});

