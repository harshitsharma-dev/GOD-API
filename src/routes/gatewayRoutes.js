/**
 * GOD API — Gateway Routes (v3)
 *
 * Three middleware layers per request:
 *   Layer 1 (gatewayLimiter)       — global per-tenant: 60 req/min
 *   Layer 2 (getProviderLimiter)   — per-tenant × per-provider quotas
 *   Layer 3 (cacheMiddleware)      — GET response cache (Redis / in-memory)
 *
 * Layer 3 short-circuits on cache HIT — controller is never called.
 * POST/PATCH/DELETE always bypass the cache entirely.
 */
const router = require('express').Router();
const gatewayController = require('../controllers/gatewayController');
const { gatewayLimiter, getProviderLimiter } = require('../middleware/rateLimiter');
const { cacheMiddleware } = require('../middleware/cache');

// ── Layer 1: Global per-tenant rate limit ────────────────────────────────────
router.use(gatewayLimiter);

// ── Layers 2 + 3 + Controller — all scoped to /:provider/* ─────────────────
router.all('/:provider/*', (req, res, next) => {
    // Layer 2: Per-provider rate limit (dynamic, cached limiter instance)
    const providerLimiter = getProviderLimiter(req.params.provider);
    providerLimiter(req, res, next);
}, (req, res, next) => {
    // Layer 3: Response cache (GET only, provider-specific TTL)
    const cache = cacheMiddleware(req.params.provider);
    cache(req, res, next);
}, gatewayController.handleGatewayRequest);

module.exports = router;

