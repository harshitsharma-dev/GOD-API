const UsageLog = require('../models/UsageLog');
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
    const { provider, allowFallback = false } = req.body;
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

        let responseTimeMs = Date.now() - startTime;

        // 2. Log Attempt (with token data — never null)
        await UsageLog.create({
            userId: req.user?._id,
            provider: effectiveProvider,
            request: { message, isSmartRouting, allowFallback },
            response: result,
            tokensUsed: result.tokens || EMPTY_TOKENS
        }).catch(err => console.error('[GATEWAY] Logging error:', err.message));

        // 3. Optional Fallback (CONTROLLED)
        // If primary failed and allowFallback = true -> try Gemini
        let usedFallback = false;
        let originalProvider = null;

        if (!result.success && allowFallback && effectiveProvider !== 'gemini') {
            console.log(`[GATEWAY] Primary (${effectiveProvider}) failed. Falling back to Gemini...`);

            const fallbackStart = Date.now();
            const fallbackResult = await gemini.handleRequest(message);
            responseTimeMs = Date.now() - fallbackStart;

            // Log Fallback Attempt
            await UsageLog.create({
                userId: req.user?._id,
                provider: 'gemini',
                request: { message, isFallback: true, originalProvider: effectiveProvider, isSmartRouting },
                response: fallbackResult,
                tokensUsed: fallbackResult.tokens || EMPTY_TOKENS
            }).catch(err => console.error('[GATEWAY] Fallback logging error:', err.message));

            if (fallbackResult.success) {
                usedFallback = true;
                originalProvider = effectiveProvider;
                result = fallbackResult;
            }
        }

        // 4. Build clean response
        const tokens = result.tokens || null;

        const response = {
            success: result.success,
            data: result.data || null,
            error: result.error || undefined,
            _god: {
                provider: usedFallback ? 'gemini' : (result.provider || effectiveProvider),
                responseTimeMs,
                tokens: tokens,
                smartRouting: isSmartRouting || undefined,
                fallback: usedFallback || undefined,
                originalProvider: originalProvider || undefined,
            }
        };

        return res.json(response);

    } catch (error) {
        console.error(`[GATEWAY] Critical error:`, error.message);
        return res.status(500).json({
            success: false,
            error: 'Internal Gateway Error',
            _god: { provider: effectiveProvider, responseTimeMs: 0, tokens: null }
        });
    }
};
