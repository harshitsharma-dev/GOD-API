/**
 * GOD API — Root Router
 *
 * Mounts all sub-routers and defines public endpoints (health, root).
 * Auth middleware is applied in the sub-routers, not here — so /health
 * and /admin/tenants can function without a GOD API key.
 */
const router = require('express').Router();
const adminRoutes = require('./adminRoutes');
const gatewayRoutes = require('./gatewayRoutes');
const discoveryRoutes = require('./discoveryRoutes');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const { authenticateApiKey } = require('../middleware/auth');
const ProviderFactory = require('../providers/ProviderFactory');

// ── Public Endpoints ────────────────────────────────────────────────────────

/**
 * GET /
 * Landing info endpoint — no auth required.
 */
router.get('/', (req, res) => {
    res.json({
        name: 'GOD API',
        tagline: 'One Key. Every API. Zero Friction.',
        version: '1.0.0',
        docs: 'https://github.com/your-org/god-api',
        endpoints: {
            health: 'GET /health',
            createTenant: 'POST /admin/tenants',
            providers: 'GET /v1/_/providers  (auth required)',
            tools: 'GET /v1/_/providers/:name/tools  (auth required)',
            gateway: 'ANY /v1/:provider/*  (auth required)',
            usage: 'GET /v1/_/usage  (auth required)',
        },
        providers: ProviderFactory.listProviders().map(p => p.name),
    });
});

/**
 * GET /health
 * Public health check — no auth required.
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

// ── Authenticated Routes ────────────────────────────────────────────────────

// User auth routes (public: signup/login, protected: /me)
router.use('/auth', authRoutes);

// User dashboard + key management (JWT protected)
router.use('/dashboard', dashboardRoutes);
router.use('/keys', dashboardRoutes);

// Admin routes — no tenant auth, but rate limited
router.use('/admin', adminRoutes);

// All /v1/* routes — requires valid GOD API key
router.use('/v1', authenticateApiKey);

// Discovery routes: /v1/_/... (must be BEFORE gateway to avoid /:provider clash)
router.use('/v1/_', discoveryRoutes);

// Gateway routes: /v1/:provider/*
router.use('/v1', gatewayRoutes);

// ── 404 Handler ─────────────────────────────────────────────────────────────
router.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route '${req.method} ${req.url}' not found`,
        code: 'NOT_FOUND',
        hint: 'See GET / for available endpoints',
    });
});

module.exports = router;
