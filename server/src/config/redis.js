import { createClient } from 'redis';

/**
 * Redis Client Configuration
 * Used for caching pricing calculations
 * 
 * Cache Key Format: PRICE::{PRODUCT_ID}::{USER_SEGMENT}::{GEO_ZONE}
 * TTL: 900 seconds (15 minutes)
 */

const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:6379`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis: Too many reconnection attempts, giving up');
        return new Error('Redis reconnection failed');
      }
      // Exponential backoff: 50ms, 100ms, 200ms, etc.
      return Math.min(retries * 50, 3000);
    }
  }
});

let isConnected = false;

// Connection event handlers
redisClient.on('connect', () => {
  console.log('🔌 Redis: Connecting...');
});

redisClient.on('ready', () => {
  isConnected = true;
  const config = {
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:6379`,
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    status: 'CONNECTED'
  };
  console.log('✅ Redis: Connected successfully');
  console.log('📋 Redis Configuration:', JSON.stringify(config, null, 2));
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error('❌ Redis connection failed:', err.message);
  console.log('⚠️ Pricing will work without cache (slower performance)');
});

/**
 * Helper functions for pricing cache
 */
export const PricingCache = {
  /**
   * Generate cache key for pricing
   */
  generateKey: (productId, userSegmentId, geoZoneId) => {
    return `PRICE::${productId}::${userSegmentId || 'GUEST'}::${geoZoneId || 'DEFAULT'}`;
  },

  /**
   * Get cached price
   */
  get: async (key) => {
    if (!isConnected) return null;
    
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  /**
   * Set cached price with TTL
   */
  set: async (key, value, ttl = 900) => {
    if (!isConnected) return false;
    
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  /**
   * Invalidate cache by pattern
   */
  invalidate: async (pattern) => {
    if (!isConnected) return 0;
    
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🗑️ Invalidated ${keys.length} cache keys matching: ${pattern}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error('Redis INVALIDATE error:', error);
      return 0;
    }
  },

  /**
   * Invalidate all pricing cache
   */
  invalidateAll: async () => {
    return await PricingCache.invalidate('PRICE::*');
  },

  /**
   * Invalidate cache for specific product
   */
  invalidateProduct: async (productId) => {
    return await PricingCache.invalidate(`PRICE::${productId}::*`);
  },

  /**
   * Invalidate cache for specific user segment
   */
  invalidateSegment: async (userSegmentId) => {
    return await PricingCache.invalidate(`PRICE::*::${userSegmentId}::*`);
  },

  /**
   * Invalidate cache for specific geo zone
   */
  invalidateZone: async (geoZoneId) => {
    return await PricingCache.invalidate(`PRICE::*::*::${geoZoneId}`);
  }
};

export default redisClient;
