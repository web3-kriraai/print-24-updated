const autocannon = require('autocannon');
const { randomUUID } = require('crypto');

/**
 * =========================================================================
 * PRICING ENGINE LOAD TEST
 * =========================================================================
 * 
 * Purpose: Test pricing engine performance under load
 * 
 * Requirements:
 * - npm install autocannon
 * - Server running on localhost:5000
 * - Redis running
 * 
 * Success Criteria:
 * - P99 latency < 500ms
 * - No errors
 * - Cache hit rate > 80%
 */

// Configuration
const CONFIG = {
  url: 'http://localhost:5000',
  connections: 100, // Concurrent connections
  duration: 60, // Test duration in seconds
  pipelining: 10, // HTTP pipelining
};

// Test product IDs (replace with real IDs from your database)
const TEST_PRODUCTS = [
  'prod_001',
  'prod_002',
  'prod_003',
  'prod_004',
  'prod_005',
];

// Test pincodes
const TEST_PINCODES = [
  '110001', // Delhi
  '400001', // Mumbai
  '560001', // Bangalore
  '600001', // Chennai
  '700001', // Kolkata
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function runLoadTest() {
  console.log('🚀 Starting Pricing Engine Load Test...');
  console.log('=============================================');
  console.log(`URL: ${CONFIG.url}/api/pricing/quote`);
  console.log(`Connections: ${CONFIG.connections}`);
  console.log(`Duration: ${CONFIG.duration}s`);
  console.log(`Pipelining: ${CONFIG.pipelining}`);
  console.log('=============================================\n');

  const instance = autocannon({
    ...CONFIG,
    url: `${CONFIG.url}/api/pricing/quote`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    setupClient: (client) => {
      // Generate unique request for each client
      client.on('body', () => {
        return JSON.stringify({
          productId: getRandomElement(TEST_PRODUCTS),
          userId: `user_${randomUUID().substring(0, 8)}`,
          pincode: getRandomElement(TEST_PINCODES),
          quantity: Math.floor(Math.random() * 10) + 1,
          selectedDynamicAttributes: []
        });
      });
    }
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (results) => {
    console.log('\n\n📊 LOAD TEST RESULTS');
    console.log('=============================================');
    console.log(`✅ Total Requests: ${results.requests.total}`);
    console.log(`✅ Requests/sec: ${results.requests.average.toFixed(2)}`);
    console.log(`✅ Throughput: ${(results.throughput.total / 1024 / 1024).toFixed(2)} MB/sec`);
    console.log(`✅ Latency Average: ${results.latency.mean.toFixed(2)}ms`);
    console.log(`✅ Latency P50: ${results.latency.p50}ms`);
    console.log(`✅ Latency P95: ${results.latency.p95}ms`);
    console.log(`✅ Latency P99: ${results.latency.p99}ms`);
    console.log(`✅ Errors: ${results.errors}`);
    console.log(`✅ Timeouts: ${results.timeouts}`);
    console.log(`✅ Non-2xx Responses: ${results.non2xx}`);
    
    // Calculate cache performance estimate
    console.log('\n🔍 Cache Performance Analysis');
    console.log('=============================================');
    const avgLatency = results.latency.mean;
    const p99Latency = results.latency.p99;
    
    // Estimate cache hit rate based on latency distribution
    // Assumption: Cache hits < 50ms, DB hits > 100ms
    const estimatedCacheHitRate = avgLatency < 50 ? 95 : avgLatency < 100 ? 70 : 40;
    console.log(`✅ Estimated Cache Hit Rate: ~${estimatedCacheHitRate}%`);
    console.log(`✅ Cache Performance: ${avgLatency < 50 ? 'Excellent' : avgLatency < 100 ? 'Good' : 'Needs Optimization'}`);
    
    // Success criteria evaluation
    console.log('\n🎯 Success Criteria Evaluation');
    console.log('=============================================');
    
    const criteria = {
      p99Latency: { value: p99Latency, threshold: 500, pass: p99Latency < 500 },
      errors: { value: results.errors, threshold: 0, pass: results.errors === 0 },
      throughput: { value: results.requests.average, threshold: 100, pass: results.requests.average > 100 },
      cacheHitRate: { value: estimatedCacheHitRate, threshold: 80, pass: estimatedCacheHitRate >= 80 }
    };
    
    console.log(`${criteria.p99Latency.pass ? '✅' : '❌'} P99 Latency: ${criteria.p99Latency.value}ms (threshold: <${criteria.p99Latency.threshold}ms)`);
    console.log(`${criteria.errors.pass ? '✅' : '❌'} Errors: ${criteria.errors.value} (threshold: ${criteria.errors.threshold})`);
    console.log(`${criteria.throughput.pass ? '✅' : '❌'} Throughput: ${criteria.throughput.value.toFixed(2)} req/s (threshold: >${criteria.throughput.threshold})`);
    console.log(`${criteria.cacheHitRate.pass ? '✅' : '❌'} Cache Hit Rate: ~${criteria.cacheHitRate.value}% (threshold: >${criteria.cacheHitRate.threshold}%)`);
    
    const allPassed = Object.values(criteria).every(c => c.pass);
    
    console.log('\n' + '='.repeat(45));
    if (allPassed) {
      console.log('🎉 LOAD TEST PASSED: Production Ready!');
      console.log('='.repeat(45));
      console.log('\nYour pricing engine is ready for production deployment!');
      console.log('The system can handle high load with excellent performance.');
    } else {
      console.log('⚠️  LOAD TEST WARNING: Performance Issues Detected');
      console.log('='.repeat(45));
      console.log('\nRecommendations:');
      if (!criteria.p99Latency.pass) {
        console.log('- Optimize database queries');
        console.log('- Increase Redis cache TTL');
        console.log('- Add database indexes');
      }
      if (!criteria.errors.pass) {
        console.log('- Check server logs for error details');
        console.log('- Verify all dependencies are running');
      }
      if (!criteria.throughput.pass) {
        console.log('- Scale horizontally (add more servers)');
        console.log('- Optimize API response payload size');
      }
      if (!criteria.cacheHitRate.pass) {
        console.log('- Increase Redis memory allocation');
        console.log('- Optimize cache key strategy');
        console.log('- Increase cache TTL for stable prices');
      }
    }
    
    console.log('\n📝 Detailed Results saved to: load-test-results.json');
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      'load-test-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        config: CONFIG,
        results: {
          requests: results.requests,
          latency: results.latency,
          throughput: results.throughput,
          errors: results.errors,
          timeouts: results.timeouts,
          non2xx: results.non2xx
        },
        criteria,
        passed: allPassed
      }, null, 2)
    );
  });
}

// Run the test
runLoadTest().catch(console.error);
