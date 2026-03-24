/**
 * GOD API — Discovery Routes (MCP-style)
 *
 * These are AUTHENTICATED routes (require Bearer token) that expose
 * provider metadata and usage information.
 *
 * GET /v1/_/providers               — List all providers
 * GET /v1/_/providers/:name         — Provider detail
 * GET /v1/_/providers/:name/tools   — Provider tools (MCP-compatible)
 * GET /v1/_/usage                   — Current tenant usage
 * GET /v1/_/health                  — Authenticated health check
 */
const router = require('express').Router();
const discoveryController = require('../controllers/discoveryController');

router.get('/providers', discoveryController.listProviders);
router.get('/providers/:name', discoveryController.getProvider);
router.get('/providers/:name/tools', discoveryController.listProviderTools);
router.get('/usage', discoveryController.getMyUsage);
router.get('/health', discoveryController.health);

module.exports = router;
