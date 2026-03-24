/**
 * GOD API — Discovery Controller (MCP-style)
 *
 * Self-documenting, machine-readable provider and tool discovery endpoints.
 * Inspired by the Model Context Protocol (MCP) tool discovery pattern.
 *
 * Endpoints:
 *   GET /v1/_/providers               — List all providers
 *   GET /v1/_/providers/:name         — Get provider detail
 *   GET /v1/_/providers/:name/tools   — Get provider's tool definitions
 *   GET /v1/_/usage                   — Current tenant's usage stats
 *   GET /v1/_/health                  — Platform health check
 */
const ProviderFactory = require('../providers/ProviderFactory');
const AnalyticsService = require('../services/analyticsService');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /v1/_/providers
 * List all registered providers.
 */
exports.listProviders = (req, res) => {
    const providers = ProviderFactory.listProviders();
    return successResponse(res, {
        count: providers.length,
        providers,
    }, `${providers.length} providers available`);
};

/**
 * GET /v1/_/providers/:name
 * Get metadata about a specific provider.
 */
exports.getProvider = (req, res, next) => {
    try {
        const provider = ProviderFactory.getProvider(req.params.name);
        return successResponse(res, {
            name: provider.name,
            displayName: provider.displayName,
            description: provider.description,
            baseUrl: provider.baseUrl,
            docsUrl: provider.docsUrl,
            version: provider.version,
            tools: provider.listTools(),
        }, `Provider '${provider.displayName}' info`);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /v1/_/providers/:name/tools
 * MCP-compatible tool list — maps to the provider's listTools() method.
 * Machine-readable by AI models and developer tooling.
 */
exports.listProviderTools = (req, res, next) => {
    try {
        const provider = ProviderFactory.getProvider(req.params.name);
        const tools = provider.listTools();

        return successResponse(res, {
            provider: provider.name,
            displayName: provider.displayName,
            version: provider.version,
            count: tools.length,
            tools,
        }, `${tools.length} tools available for ${provider.displayName}`);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /v1/_/usage
 * Get the authenticated tenant's usage statistics.
 * Query param: ?days=7 (default) or ?days=30
 */
exports.getMyUsage = async (req, res, next) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 7, 90); // max 90 days
        const usage = await AnalyticsService.getTenantUsage(req.tenant._id, days);

        return successResponse(res, {
            tenant: {
                id: req.tenant._id,
                name: req.tenant.name,
                plan: req.tenant.plan,
                keyPrefix: req.tenant.keyPrefix,
            },
            usage,
        }, 'Usage data retrieved');
    } catch (error) {
        next(error);
    }
};

/**
 * GET /v1/_/health
 * Platform health endpoint (authenticated — requires valid GOD API key).
 */
exports.health = (req, res) => {
    return res.json({
        status: 'healthy',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        providers: ProviderFactory.listProviders().map(p => p.name),
        tenant: req.tenant ? req.tenant.name : null,
    });
};
