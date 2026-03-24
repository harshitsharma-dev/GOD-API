/**
 * GOD API — Base Provider (Adapter Interface)
 *
 * Defines the standard 3-method adapter contract that every provider MUST implement:
 *
 *   transformRequest(godReq)      → providerReq
 *   transformResponse(provRes)    → godRes  (standardized envelope)
 *   handleError(err)              → normalized error object
 *
 * The request lifecycle through the gateway is now an explicit pipeline:
 *
 *   GOD Request
 *       │
 *       ▼
 *   transformRequest()   — shape GOD input → provider-specific format
 *       │
 *       ▼
 *   _execute()           — Axios HTTP call (done here in BaseProvider)
 *       │
 *       ▼
 *   transformResponse()  — shape provider response → standard GOD envelope
 *       │
 *       ▼
 *   Tenant
 *
 * Error path:
 *   Axios error → handleError() → normalized { status, message, code }
 *
 * Subclasses SHOULD override transformRequest, transformResponse, and handleError.
 * Default implementations are pass-throughs so existing providers still work.
 */
const axios = require('axios');

class BaseProvider {
    /**
     * @param {string} baseURL         Provider root URL
     * @param {Object} defaultHeaders  Auth + content-type headers
     */
    constructor(baseURL, defaultHeaders = {}) {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL,
            headers: {
                'User-Agent': 'GOD-API/1.0',
                ...defaultHeaders,
            },
            timeout: 30000,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADAPTER INTERFACE — override these in each provider
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Transform the incoming GOD API request into the format the provider expects.
     *
     * Override to:
     *  - Rename / restructure body fields
     *  - Add provider-required wrapper keys
     *  - Inject static required params (e.g. api-version headers)
     *
     * @param {{ method, path, body, query, headers }} godReq
     * @returns {{ method, path, body, query, headers }}
     */
    transformRequest({ method, path, body, query, headers }) {
        // Default: pass through unchanged
        return { method, path, body, query, headers };
    }

    /**
     * Transform the provider's raw response into the standardized GOD API envelope.
     *
     * Every provider must eventually return this shape so tenants get
     * a consistent structure regardless of which upstream responded:
     * {
     *   _god: { provider, requestId, responseTimeMs },
     *   ...provider data (merged at top level or nested under `data`)
     * }
     *
     * Override to unwrap, rename, or enrich the provider's payload.
     *
     * @param {{ status: number, data: any }} providerResponse
     * @param {{ provider: string, requestId: string, responseTimeMs: number }} meta
     * @returns {{ status: number, body: any }}
     */
    transformResponse(providerResponse, meta) {
        // Default: return provider data with a _god metadata sidecar
        return {
            status: providerResponse.status,
            body: {
                ...providerResponse.data,
                _god: {
                    provider:        meta.provider,
                    requestId:       meta.requestId,
                    responseTimeMs:  meta.responseTimeMs,
                },
            },
        };
    }

    /**
     * Normalize an upstream error into a consistent GOD API error shape.
     *
     * Override to extract provider-specific error codes, messages, or fields
     * that differ from the default shape (e.g., Stripe wraps errors in `.error`,
     * OpenAI wraps in `.error.message`, Twilio in `.message`).
     *
     * @param {Error|Object} err  Raw Axios error
     * @returns {{ status: number, message: string, code: string, upstream?: any }}
     */
    handleError(err) {
        // ── Upstream HTTP error (provider returned 4xx/5xx) ────────────────
        if (err.response) {
            const data = err.response.data;
            const message =
                data?.error?.message ||
                data?.message        ||
                data?.error          ||
                `Provider returned HTTP ${err.response.status}`;

            return {
                status:   err.response.status,
                message:  String(message),
                code:     'PROVIDER_ERROR',
                upstream: data,
            };
        }

        // ── Network / timeout ────────────────────────────────────────────────
        if (err.request) {
            return {
                status:  502,
                message: `Could not reach provider: ${err.message}`,
                code:    'PROVIDER_UNREACHABLE',
            };
        }

        // ── Unexpected / local error ─────────────────────────────────────────
        return {
            status:  500,
            message: `Adapter error: ${err.message}`,
            code:    'ADAPTER_ERROR',
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE ENGINE — not overridden by subclasses
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Execute the full adapter pipeline for a single tenant request.
     *
     * Called by the gateway controller. Orchestrates:
     *   transformRequest → _execute → transformResponse
     * Errors are caught and routed through handleError.
     *
     * @param {Object} godReq  Raw request data from the gateway controller
     * @param {Object} meta    { provider, requestId, responseTimeMs }
     * @returns {{ status: number, body: any }}
     */
    async execute(godReq, meta = {}) {
        // 1. Transform input
        const provReq = this.transformRequest(godReq);

        let rawResponse;
        try {
            // 2. Execute HTTP call
            rawResponse = await this._httpCall(provReq);
        } catch (axiosErr) {
            // 3. Normalize error through the adapter's handleError
            const normalized = this.handleError(axiosErr);
            // Throw so the gateway controller can catch, log, and forward to errorHandler
            const err = new Error(normalized.message);
            err.status   = normalized.status;
            err.code     = normalized.code;
            err.provider = this.name || this.constructor.name;
            err.upstream = normalized.upstream;
            throw err;
        }

        // 4. Transform response
        return this.transformResponse(rawResponse, {
            provider:       this.name || this.constructor.name,
            requestId:      meta.requestId,
            responseTimeMs: meta.responseTimeMs,
        });
    }

    /**
     * Raw Axios HTTP call. Not meant to be overridden.
     * @private
     */
    async _httpCall({ method, path, body, query, headers = {} }) {
        const response = await this.client({
            method,
            url:    path,
            data:   ['GET', 'DELETE', 'HEAD'].includes(method.toUpperCase()) ? undefined : body,
            params: query,
            headers,
        });
        return { status: response.status, data: response.data };
    }

    /**
     * Legacy compatibility shim.
     * Old code that calls forwardRequest() still works — it bypasses the
     * transform pipeline and hits the HTTP layer directly.
     *
     * @deprecated Use execute() instead for new code.
     */
    async forwardRequest(method, path, data = {}, params = {}, headers = {}) {
        return this._httpCall({ method, path, body: data, query: params, headers });
    }
}

module.exports = BaseProvider;
