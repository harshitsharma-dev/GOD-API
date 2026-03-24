/**
 * GOD API — Redis Client
 *
 * Creates a single shared ioredis client for the whole process.
 * If Redis is unavailable (no REDIS_URL, or connection fails), the client
 * emits an error but does NOT crash the server — rate limiting silently falls
 * back to in-memory mode.
 *
 * Usage: const redis = require('./redis');
 */
const Redis = require('ioredis');

let client = null;
let isConnected = false;

const connect = () => {
    const url = process.env.REDIS_URL;

    if (!url) {
        console.warn('⚠️  REDIS_URL not set — rate limiting will use in-memory store');
        return null;
    }

    const redis = new Redis(url, {
        // Don't keep retrying if Redis is genuinely unavailable in dev.
        // In prod you'd want retryStrategy to keep retrying.
        retryStrategy: (times) => {
            if (times > 3) {
                console.warn(`⚠️  Redis: connection failed after ${times} attempts — falling back to in-memory rate limiting`);
                return null; // Stop retrying
            }
            return Math.min(times * 300, 2000); // Retry delay: 300ms, 600ms, 900ms
        },
        enableOfflineQueue: false, // Fail fast instead of queuing commands
        lazyConnect: false,
        connectTimeout: 5000,
    });

    redis.on('connect', () => {
        isConnected = true;
        console.log('🔴  Redis connected');
    });

    redis.on('error', (err) => {
        if (isConnected) {
            isConnected = false;
            console.error('⚠️  Redis error — falling back to in-memory limits:', err.message);
        }
    });

    redis.on('close', () => {
        isConnected = false;
    });

    return redis;
};

client = connect();

/**
 * Returns true only when Redis is available and the connection is live.
 * Used by rate limiter to decide which store to use.
 */
const isRedisAvailable = () => isConnected && client !== null;

module.exports = { client, isRedisAvailable };
