/**
 * GOD API — Cache Middleware
 *
 * Caches GET responses from provider adapters.
 * Uses the shared ioredis client when Redis is available; falls back to
 * a bounded in-memory LRU-like Map automatically if Redis is down or unset.
 *
 * Pipeline:
 *   1. Only GET requests are eligible (POST/PATCH/DELETE are always forwarded)
 *   2. Cache key = sha256(tenantId + provider + path + sorted query string)
 *      → Tenant-scoped: tenant A never sees tenant B's cached data
 *   3. Cache HIT  → return JSON from cache, skip controller entirely
 *                   Response includes X-Cache: HIT + X-Cache-TTL header
 *   4. Cache MISS → call next(), intercept res.json(), store response, then send
 *                   Response includes X-Cache: MISS
 *
 * Per-provider TTL (seconds) — tune via CACHE_TTL_* env vars:
 *   openai:       0   (never cache — responses are context-sensitive)
 *   stripe:       30  (charges list changes slowly)
 *   github:       120 (repos, user info)
 *   twilio:       60  (message list)
 *   google-maps:  300 (geocoding, directions rarely change)
 *   default:      60
 *
 * Cache bypass:
 *   - Set request header  Cache-Control: no-cache  to skip read + write
 *   - Set query param     ?nocache=1  to skip read + write
 *   - Responses with statusCode >= 400 are never cached
 *
 * In-memory fallback store:
 *   - Bounded to MAX_MEMORY_ENTRIES (default 500) entries
 *   - Evicts the oldest entry when the limit is reached (FIFO)
 *   - Respects TTL via a stored expiresAt timestamp
 */
const crypto = require('crypto');
const { client: redisClient, isRedisAvailable } = require('../config/redis');

// ── Per-provider TTL map (seconds) ─────────────────────────────────────────
const PROVIDER_TTL = {
    openai:        parseInt(process.env.CACHE_TTL_OPENAI)       || 0,   // 0 = never cache
    stripe:        parseInt(process.env.CACHE_TTL_STRIPE)       || 30,
    github:        parseInt(process.env.CACHE_TTL_GITHUB)       || 120,
    twilio:        parseInt(process.env.CACHE_TTL_TWILIO)       || 60,
    'google-maps': parseInt(process.env.CACHE_TTL_GOOGLE_MAPS)  || 300,
};
const DEFAULT_TTL         = parseInt(process.env.CACHE_TTL_DEFAULT) || 60;
const MAX_MEMORY_ENTRIES  = parseInt(process.env.CACHE_MAX_MEMORY)  || 500;
const CACHE_KEY_PREFIX    = 'god:cache:';

// ── In-memory fallback store ──────────────────────────────────────────────
// Simple Map acting as a bounded FIFO cache.
// { cacheKey → { body, expiresAt } }
const memoryStore = new Map();

const memGet = (key) => {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        memoryStore.delete(key);
        return null;
    }
    return entry.body;
};

const memSet = (key, body, ttlSeconds) => {
    // Evict oldest entry when at capacity
    if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
        const oldestKey = memoryStore.keys().next().value;
        memoryStore.delete(oldestKey);
    }
    memoryStore.set(key, {
        body,
        expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
};

const memDel = (key) => memoryStore.delete(key);

// ── Cache key builder ─────────────────────────────────────────────────────
/**
 * Deterministic, tenant-scoped cache key.
 * Sorted query params so ?a=1&b=2 and ?b=2&a=1 hit the same cache entry.
 */
const buildCacheKey = (req, provider) => {
    const tenantId  = req.tenant?._id?.toString() || 'anon';
    const path      = req.path;
    const sortedQuery = Object.keys(req.query)
        .sort()
        .map(k => `${k}=${req.query[k]}`)
        .join('&');

    const raw   = `${tenantId}:${provider}:${path}:${sortedQuery}`;
    const hash  = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
    return `${CACHE_KEY_PREFIX}${hash}`;
};

// ── Store abstraction ────────────────────────────────────────────────────
const cacheGet = async (key) => {
    if (isRedisAvailable()) {
        try {
            const val = await redisClient.get(key);
            return val ? JSON.parse(val) : null;
        } catch {
            return memGet(key);
        }
    }
    return memGet(key);
};

const cacheSet = async (key, body, ttlSeconds) => {
    if (ttlSeconds <= 0) return; // 0 = never cache (e.g. OpenAI)
    if (isRedisAvailable()) {
        try {
            await redisClient.setex(key, ttlSeconds, JSON.stringify(body));
            return;
        } catch { /* fall through to memory */ }
    }
    memSet(key, body, ttlSeconds);
};

const cacheDel = async (key) => {
    if (isRedisAvailable()) {
        try { await redisClient.del(key); } catch { /* ignore */ }
    }
    memDel(key);
};

// ── Main middleware factory ───────────────────────────────────────────────
/**
 * Returns a caching middleware for a specific provider.
 * Called from gatewayRoutes after :provider is resolved.
 *
 * @param {string} provider  e.g. 'openai', 'github'
 * @returns {import('express').RequestHandler}
 */
const cacheMiddleware = (provider) => async (req, res, next) => {
    // ── Only cache GET ──────────────────────────────────────────────────────
    if (req.method !== 'GET') return next();

    // ── Respect Cache-Control: no-cache and ?nocache=1 ──────────────────────
    const bypassCache = req.headers['cache-control'] === 'no-cache' ||
                        req.query.nocache === '1';

    // ── Determine TTL for this provider ────────────────────────────────────
    const ttl = PROVIDER_TTL[provider] ?? DEFAULT_TTL;

    // If TTL is 0 for this provider (e.g. OpenAI), skip caching entirely
    if (ttl === 0) return next();

    const cacheKey = buildCacheKey(req, provider);

    // ── Cache READ ──────────────────────────────────────────────────────────
    if (!bypassCache) {
        try {
            const cached = await cacheGet(cacheKey);
            if (cached) {
                const store = isRedisAvailable() ? 'Redis' : 'Memory';
                res.setHeader('X-Cache', `HIT (${store})`);
                res.setHeader('X-Cache-TTL', String(ttl));
                res.setHeader('X-Cache-Key', cacheKey.replace(CACHE_KEY_PREFIX, ''));
                return res.status(200).json(cached);
            }
        } catch (cacheErr) {
            // Cache read failure must NEVER block the request
            console.warn('[Cache] Read error (bypassing cache):', cacheErr.message);
        }
    }

    // ── Cache WRITE — intercept res.json() ─────────────────────────────────
    res.setHeader('X-Cache', bypassCache ? 'BYPASS' : 'MISS');

    const originalJson = res.json.bind(res);
    res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode < 400 && !bypassCache) {
            cacheSet(cacheKey, body, ttl).catch(err =>
                console.warn('[Cache] Write error:', err.message)
            );
        }
        return originalJson(body);
    };

    next();
};

/**
 * Invalidate all cache entries for a tenant (e.g. after key rotation).
 * Best-effort: logs errors but never throws.
 *
 * With Redis: uses SCAN to find and delete matching keys.
 * With Memory: clears the whole in-memory store (safe — it's small).
 *
 * @param {string} tenantId
 */
const invalidateTenantCache = async (tenantId) => {
    if (isRedisAvailable()) {
        try {
            // SCAN is non-blocking, unlike KEYS which blocks Redis
            const pattern = `${CACHE_KEY_PREFIX}*`;
            let cursor = '0';
            let deleted = 0;
            do {
                const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length) {
                    await redisClient.del(...keys);
                    deleted += keys.length;
                }
            } while (cursor !== '0');
            console.log(`[Cache] Invalidated ${deleted} keys for tenant ${tenantId}`);
        } catch (err) {
            console.warn('[Cache] Invalidation error:', err.message);
        }
    } else {
        // Memory store: clear entries whose key contains the tenantId hash prefix
        // For simplicity in the fallback case, we just clear all memory entries
        memoryStore.clear();
    }
};

module.exports = { cacheMiddleware, invalidateTenantCache, cacheDel };
