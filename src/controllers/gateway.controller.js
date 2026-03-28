const UsageLog = require('../models/UsageLog');
const gemini = require('../adapters/gemini.adapter');
const groq = require('../adapters/groq.adapter');
const mistral = require('../adapters/mistral.adapter');
const together = require('../adapters/together.adapter');
const huggingface = require('../adapters/huggingface.adapter');

const openrouter = require('../adapters/openrouter.adapter');
const replicate = require('../adapters/replicate.adapter');

const adapters = {
    gemini,
    groq,
    mistral,
    together,
    huggingface,
    openrouter,
    replicate
};


/**
 * GOD API Gateway Controller
 * Handles AI provider routing, smart routing, and controlled fallbacks.
 */
exports.handleRequest = async (req, res) => {
    const { provider, message, allowFallback = false } = req.body;
    
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: User context required' });
    }

    if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
    }

    let effectiveProvider = provider?.toLowerCase();
    let isSmartRouting = false;

    // --- CASE 2: No provider given -> SMART ROUTING ---
    if (!effectiveProvider) {
        isSmartRouting = true;
        const msg = message.toLowerCase();

        // Rules:
        // * coding keywords -> mistral or huggingface
        // * length < 30 -> groq
        // * length > 200 -> mistral
        // * otherwise -> gemini
        if (msg.includes('code') || msg.includes('function') || msg.includes('bug') || msg.includes('debug') || msg.includes('algorithm') || msg.includes('program')) {
            effectiveProvider = 'mistral'; 
        } else if (message.length < 30) {
            effectiveProvider = 'groq';
        } else if (message.length > 200) {
            effectiveProvider = 'mistral';
        } else {
            effectiveProvider = 'gemini';
        }
    }

    const adapter = adapters[effectiveProvider];
    if (!adapter) {
        return res.status(400).json({ 
            success: false, 
            provider: effectiveProvider || 'unknown', 
            error: `Invalid or unsupported provider: ${effectiveProvider}` 
        });
    }

    try {
        console.log(`[GATEWAY] Routing request to: ${effectiveProvider} (SmartRouting: ${isSmartRouting})`);

        // 1. Call the Primary Provider
        let result = await adapter.handleRequest(message);

        // 2. Log Attempt
        await UsageLog.create({
            userId: req.user?._id,
            provider: effectiveProvider,
            request: { message, isSmartRouting, allowFallback },
            response: result
        }).catch(err => console.error('[GATEWAY] Logging error:', err.message));

        // 3. CASE 3: Optional Fallback (CONTROLLED)
        // If primary failed and allowFallback = true -> try Gemini
        if (!result.success && allowFallback && effectiveProvider !== 'gemini') {
            console.log(`[GATEWAY] Primary (${effectiveProvider}) failed. Falling back to Gemini (allowFallback=true)...`);
            
            const fallbackResult = await gemini.handleRequest(message);
            
            // Log Fallback Attempt
            await UsageLog.create({
                userId: req.user?._id,
                provider: 'gemini',
                request: { message, isFallback: true, originalProvider: effectiveProvider, isSmartRouting },
                response: fallbackResult
            }).catch(err => console.error('[GATEWAY] Fallback logging error:', err.message));

            if (fallbackResult.success) {
                result = {
                    ...fallbackResult,
                    fallback: true,
                    originalProvider: effectiveProvider
                };
            }
        }

        // Add smartRouting flag to final response if applicable
        if (isSmartRouting) {
            result.smartRouting = true;
        }

        return res.json(result);

    } catch (error) {
        console.error(`[GATEWAY] Critical error:`, error.message);
        return res.status(500).json({ 
            success: false, 
            provider: effectiveProvider, 
            error: 'Internal Gateway Error' 
        });
    }
};
