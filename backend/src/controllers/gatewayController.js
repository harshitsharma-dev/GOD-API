const AnalyticsService = require('../services/analyticsService');
const { errorResponse } = require('../utils/response');

// ── All 11 Provider Adapters ────────────────────────────────────────────────
const gemini = require('../adapters/gemini.adapter');
const openai = require('../adapters/openai.adapter');
const claude = require('../adapters/claude.adapter');
const groq = require('../adapters/groq.adapter');
const mistral = require('../adapters/mistral.adapter');
const deepseek = require('../adapters/deepseek.adapter');
const together = require('../adapters/together.adapter');
const huggingface = require('../adapters/huggingface.adapter');
const openrouter = require('../adapters/openrouter.adapter');
const replicate = require('../adapters/replicate.adapter');
const perplexity = require('../adapters/perplexity.adapter');

const adapters = {
    gemini, openai, claude, groq, mistral, deepseek,
    together, huggingface, openrouter, replicate, perplexity
};

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 10000;
const EMPTY_TOKENS = { prompt: 0, completion: 0, total: 0 };

/**
 * Check if a provider's API key is actually configured.
 * Used by smart routing to avoid routing to unconfigured providers.
 */
const isProviderConfigured = (providerName) => {
    const adapter = adapters[providerName];
    return adapter && !!adapter.apiKey;
};

/**
 * GOD API Gateway Controller
 * Handles AI provider routing, smart routing, and controlled fallbacks.
 */
exports.handleRequest = async (req, res) => {
    const { provider } = req.body;
    let { message } = req.body;

    if (!req.user) {
        return errorResponse(res, 'Unauthorized: User context required', 401, 'UNAUTHORIZED');
    }

    // ── Input Validation ────────────────────────────────────────────────────
    if (!message || !String(message).trim()) {
        return errorResponse(res, 'Message is required', 400, 'VALIDATION_ERROR');
    }

    message = String(message).trim();

    if (message.length > MAX_MESSAGE_LENGTH) {
        return errorResponse(res, `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`, 400, 'MESSAGE_TOO_LONG');
    }

    // ── Provider Resolution ─────────────────────────────────────────────────
    let effectiveProvider = provider?.toLowerCase();
    let isSmartRouting = false;

    // --- No provider given -> SMART ROUTING ---
    // Only routes to providers that have valid API keys configured
    if (!effectiveProvider) {
        isSmartRouting = true;
        const msg = message.toLowerCase();

        if (msg.includes('code') || msg.includes('function') || msg.includes('bug') || msg.includes('debug') || msg.includes('algorithm') || msg.includes('program')) {
            effectiveProvider = isProviderConfigured('mistral') ? 'mistral' : 'gemini';
        } else if (message.length < 30) {
            effectiveProvider = isProviderConfigured('groq') ? 'groq' : 'gemini';
        } else if (message.length > 200) {
            effectiveProvider = isProviderConfigured('mistral') ? 'mistral' : 'gemini';
        } else {
            effectiveProvider = 'gemini';
        }
    }

    const adapter = adapters[effectiveProvider];
    if (!adapter) {
        return errorResponse(res, `Invalid or unsupported provider: ${effectiveProvider || 'unknown'}`, 400, 'INVALID_PROVIDER');
    }

    try {
        console.log(`[GATEWAY] Routing request to: ${effectiveProvider} (SmartRouting: ${isSmartRouting})`);

        const startTime = Date.now();

        // 1. Call the Primary Provider
        let result = await adapter.handleRequest(message);

        const responseTimeMs = Date.now() - startTime;

        // 2. Log Attempt (v2 Analytics — fire-and-forget)
        AnalyticsService.logRequest({
            tenantId: req.tenant?._id,
            tenantName: req.tenant?.name,
            userId: req.user?._id,
            provider: effectiveProvider,
            endpoint: '/v1/ai/chat',
            method: 'POST',
            statusCode: result.success ? 200 : 400,
            responseTimeMs,
            success: result.success,
            errorMessage: result.error,
            tokensUsed: result.tokens || EMPTY_TOKENS,
            bytesOut: JSON.stringify(result.data).length,
            requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
        });

        // 3. Build clean response (FAIL-FAST)
        // [DEPRECATED] Automated fallback removed as per fail-fast policy.
        
        const response = {
            success: result.success,
            data: result.data || null,
            error: result.error || undefined,
            _god: {
                provider: result.provider || effectiveProvider,
                responseTimeMs,
                tokens: result.tokens || EMPTY_TOKENS,
                smartRouting: isSmartRouting || undefined,
            }
        };

        return res.json(response);

    } catch (error) {
        console.error(`[GATEWAY] Critical error:`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Internal Gateway Error',
            _god: { provider: effectiveProvider, responseTimeMs: 0, tokens: EMPTY_TOKENS }
        });
    }
};
