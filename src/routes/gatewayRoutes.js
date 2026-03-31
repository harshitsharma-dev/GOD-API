const router = require('express').Router();
const gatewayController = require('../controllers/gatewayController');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { gatewayLimiter, getProviderLimiter } = require('../middleware/rateLimiter');

// ── Layer 1: Global per-tenant rate limit ────────────────────────────────────
router.use(gatewayLimiter);

// ── Layer 2: API Key Auth & Provider Routing ─────────────────────────────────

// Explicit Smart Routing
router.post('/ai/chat', apiKeyAuth, gatewayController.handleRequest);

// Provider-specific Routing
router.post('/:provider/chat', apiKeyAuth, (req, res, next) => {
    // Dynamic rate limiting per provider
    const providerLimiter = getProviderLimiter(req.params.provider);
    providerLimiter(req, res, next);
}, gatewayController.handleRequest);

// Backward compatibility (legacy / POST)
router.post('/', apiKeyAuth, gatewayController.handleRequest);

module.exports = router;
