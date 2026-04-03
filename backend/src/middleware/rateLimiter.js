/**
 * GOD API — Rate Limiter Middleware (v2)
 *
 * Production-grade rate limiting with two dimensions:
 *
 *   1. GLOBAL   — per API key, across all providers: 60 req/min (default)
 *   2. PROVIDER — per API key × per provider: tighter per-provider quotas
 *
 * Store:
 *   - Uses Redis (ioredis) when REDIS_URL is set and Redis is reachable
 *   - Automatically falls back to in-memory store if Redis is unavailable
 *   - Fallback is transparent — no code changes needed, just a log warning
 *
 * Rate limit info is returned in standard RateLimit-* headers so clients
 * can implement backoff without guessing.
 *
 * Per-provider limits (req/min) — tune via env vars or the PROVIDER_LIMITS map:
 *   openai:       20/min  (expensive, slow)
 *   stripe:       100/min (Stripe's own limit is much higher)
 *   github:       30/min  (unauthenticated is 10, authenticated 5000/hr)
 *   twilio:       100/min
 *   google-maps:  50/min
 *   default:      60/min  (any other provider)
 */
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { client: redisClient, isRedisAvailable } = require('../config/redis');

// ── Per-provider limits (requests per minute) ──────────────────────────────
const PROVIDER_LIMITS = {
    openai:        parseInt(process.env.RATE_LIMIT_OPENAI)       || 20,
    stripe:        parseInt(process.env.RATE_LIMIT_STRIPE)       || 100,
    github:        parseInt(process.env.RATE_LIMIT_GITHUB)       || 30,
    twilio:        parseInt(process.env.RATE_LIMIT_TWILIO)       || 100,
    'google-maps': parseInt(process.env.RATE_LIMIT_GOOGLE_MAPS)  || 50,
};

const GLOBAL_LIMIT    = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60;
const WINDOW_MS       = parseInt(process.env.RATE_LIMIT_WINDOW_MS)    || 60 * 1000;
const ADMIN_LIMIT     = 20;
const ADMIN_WINDOW_MS = 15 * 60 * 1000;

// ── Store factory ──────────────────────────────────────────────────────────
/**
 * Build a rate-limit store.
 * Returns a RedisStore if Redis is available, otherwise returns undefined
 * (express-rate-limit will use its default in-memory store).
 *
 * @param {string} prefix  Key prefix to namespace counts in Redis
 */
const buildStore = (prefix) => {
    if (!isRedisAvailable()) return undefined; // fallback = memory

    return new RedisStore({
        // ioredis client must expose a `sendCommand` method
        sendCommand: (...args) => redisClient.call(...args),
        prefix: `rl:${prefix}:`,
    });
};

// ── Shared rate limit response ─────────────────────────────────────────────
const rateLimitHandler = (req, res) => {
    const retryAfter = Math.ceil(WINDOW_MS / 1000);
    return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter,
        hint: `You can make up to ${GLOBAL_LIMIT} requests per minute per API key.`,
    });
};

const providerRateLimitHandler = (provider, max) => (req, res) => {
    const retryAfter = Math.ceil(WINDOW_MS / 1000);
    return res.status(429).json({
        success: false,
        error: `Rate limit exceeded for provider '${provider}'.`,
        code: 'PROVIDER_RATE_LIMIT_EXCEEDED',
        provider,
        limit: max,
        retryAfterSeconds: retryAfter,
        hint: `You can make up to ${max} requests per minute to ${provider}.`,
    });
};

// ── 1. GLOBAL limiter: per API key, all providers combined ─────────────────
const gatewayLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: GLOBAL_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('global'),

    // Key = tenant ID (after auth) or IP (before auth / on auth errors)
    keyGenerator: (req) =>
        req.tenant ? `tenant:${req.tenant._id}` : `ip:${req.ip}`,

    handler: rateLimitHandler,
    skip: (req) => process.env.NODE_ENV === 'test',
});

// ── 2. PROVIDER limiters: per API key × per provider ──────────────────────
/**
 * Returns an express-rate-limit middleware scoped to a specific provider.
 * Called dynamically by gatewayRoutes for each :provider slug.
 * Limiters are cached so the same Redis prefix isn't recreated per request.
 *
 * @param {string} provider  e.g. "openai", "stripe"
 * @returns {import('express').RequestHandler}
 */
const _providerLimiterCache = {};

const getProviderLimiter = (provider) => {
    if (_providerLimiterCache[provider]) return _providerLimiterCache[provider];

    const max = PROVIDER_LIMITS[provider] ??
        (parseInt(process.env.RATE_LIMIT_DEFAULT_PROVIDER) || 60);

    const limiter = rateLimit({
        windowMs: WINDOW_MS,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        store: buildStore(`provider:${provider}`),

        // Key = tenant:provider pair → isolated counter per provider per tenant
        keyGenerator: (req) =>
            req.tenant
                ? `tenant:${req.tenant._id}:${provider}`
                : `ip:${req.ip}:${provider}`,

        handler: providerRateLimitHandler(provider, max),
        skip: (req) => process.env.NODE_ENV === 'test',
    });

    _providerLimiterCache[provider] = limiter;
    return limiter;
};

// ── 3. ADMIN limiter: strict, IP-based only (no tenant attached yet) ────────
const adminLimiter = rateLimit({
    windowMs: ADMIN_WINDOW_MS,
    max: ADMIN_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore('admin'),
    message: {
        success: false,
        error: 'Too many admin requests. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

module.exports = { gatewayLimiter, adminLimiter, getProviderLimiter, PROVIDER_LIMITS };
