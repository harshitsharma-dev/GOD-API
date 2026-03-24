/**
 * GOD API — Gateway Controller (v2)
 *
 * Updated to use the adapter pipeline: adapter.execute(godReq, meta)
 * instead of calling forwardRequest() directly.
 *
 * The execute() method orchestrates:
 *   transformRequest → HTTP call → transformResponse
 *
 * Each provider's transformResponse() returns a normalized body with a
 * `_god` metadata sidecar — so tenants always get consistent structure.
 */
const ProviderFactory = require('../providers/ProviderFactory');
const AnalyticsService = require('../services/analyticsService');

exports.handleGatewayRequest = async (req, res, next) => {
    const startTime = Date.now();
    const { provider } = req.params;
    const tenant = req.tenant;

    const wildcard    = req.params[0] || '';
    const resourcePath = '/' + wildcard;

    let statusCode   = 500;
    let success      = false;
    let errorMessage = null;

    try {
        // ── 1. Permission check ────────────────────────────────────────────
        if (!tenant.canAccessProvider(provider)) {
            return res.status(403).json({
                success: false,
                error:   `Your account does not have access to the '${provider}' provider.`,
                code:    'PROVIDER_ACCESS_DENIED',
            });
        }

        // ── 2. Get provider adapter ────────────────────────────────────────
        const adapter = ProviderFactory.getProvider(provider);

        // ── 3. Build the GOD request object for transformRequest ──────────
        const godReq = {
            method:  req.method,
            path:    resourcePath,
            body:    req.body,
            query:   req.query,
            headers: {
                // Pass through idempotency key if present
                ...(req.headers['x-god-idempotency-key']
                    ? { 'Idempotency-Key': req.headers['x-god-idempotency-key'] }
                    : {}),
            },
        };

        // ── 4. Execute the full adapter pipeline ──────────────────────────
        //    transformRequest → HTTP → transformResponse
        const responseTimeMs = Date.now() - startTime;
        const result = await adapter.execute(godReq, {
            provider,
            requestId:      req.requestId,
            responseTimeMs,
        });

        statusCode = result.status;
        success    = statusCode < 400;

        // ── 5. Return the normalized response ─────────────────────────────
        return res.status(statusCode).json(result.body);

    } catch (error) {
        statusCode   = error.status || 500;
        success      = false;
        errorMessage = error.message;
        next(error);

    } finally {
        // ── 6. Analytics — always runs, never blocks ───────────────────────
        AnalyticsService.logRequest({
            tenantId:       tenant._id,
            tenantName:     tenant.name,
            provider,
            endpoint:       resourcePath,
            method:         req.method,
            statusCode,
            responseTimeMs: Date.now() - startTime,
            success,
            errorMessage,
            idempotencyKey: req.headers['x-god-idempotency-key'] || null,
            requestId:      req.requestId   || null,
            ipHash:         req.ipHash      || null,
            userAgent:      req.headers['user-agent'] || null,
            bytesIn:        req.bytesIn     || 0,
            bytesOut:       req.bytesOut    || 0,
            keyVersion:     tenant.keyVersion || null,
        });
    }
};
