/**
 * GOD API — Redis Client Configuration
 *
 * Provides a shared ioredis client and an isRedisAvailable() helper.
 * If REDIS_URL is not set or Redis is unreachable, the system gracefully
 * falls back to in-memory stores (rate limiter and cache handle this).
 */
let client = null;
let redisAvailable = false;

try {
    if (process.env.REDIS_URL) {
        const Redis = require('ioredis');
        client = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.warn('[Redis] Max retries reached — falling back to in-memory');
                    return null; // stop retrying
                }
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        client.on('connect', () => {
            redisAvailable = true;
            console.log('[Redis] Connected successfully');
        });

        client.on('error', (err) => {
            redisAvailable = false;
            console.warn('[Redis] Connection error (using in-memory fallback):', err.message);
        });

        client.on('close', () => {
            redisAvailable = false;
        });

        // Attempt connection (non-blocking)
        client.connect().catch(() => {
            redisAvailable = false;
            console.warn('[Redis] Initial connection failed — using in-memory fallback');
        });
    } else {
        console.log('[Redis] REDIS_URL not set — using in-memory fallback');
    }
} catch (err) {
    console.warn('[Redis] Setup error — using in-memory fallback:', err.message);
}

const isRedisAvailable = () => redisAvailable;

module.exports = { client, isRedisAvailable };
