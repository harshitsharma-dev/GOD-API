/**
 * GOD API — Stripe Adapter
 *
 * Adapter pipeline for https://api.stripe.com
 *
 * transformRequest:
 *   - Converts JSON body → application/x-www-form-urlencoded (Stripe's requirement)
 *   - Stripe uses query params for GET filters, body for POST mutations
 *
 * transformResponse:
 *   - Normalizes amount fields: converts cents → dollars (e.g. 1000 → "$10.00")
 *   - Promotes id, object, status to root level
 *
 * handleError:
 *   - Extracts Stripe's error.type, error.code, error.decline_code
 *   - Maps to human-friendly GOD error codes
 */
const BaseProvider = require('./BaseProvider');
const { URLSearchParams } = require('url');

class StripeAdapter extends BaseProvider {
    constructor() {
        const encodedKey = Buffer.from(`${process.env.STRIPE_SECRET_KEY}:`).toString('base64');
        super('https://api.stripe.com', {
            Authorization:  `Basic ${encodedKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        });

        this.name        = 'stripe';
        this.displayName = 'Stripe';
        this.description = 'Payments, subscriptions, billing, customer management via Stripe APIs.';
        this.baseUrl     = 'https://api.stripe.com';
        this.docsUrl     = 'https://stripe.com/docs/api';
        this.version     = 'v1';
    }

    // ── Adapter Interface ────────────────────────────────────────────────────

    transformRequest({ method, path, body, query, headers }) {
        const isWrite = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());

        // Stripe always requires form-encoded bodies for write operations
        let transformedBody = body;
        if (isWrite && body && typeof body === 'object') {
            transformedBody = new URLSearchParams(this._flattenObject(body)).toString();
        }

        return {
            method,
            path,
            body:    transformedBody,
            query,
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };
    }

    transformResponse(providerResponse, meta) {
        const data = providerResponse.data;

        // Normalize amount fields from cents → human-readable dollars
        const normalized = this._normalizeAmounts(data);

        return {
            status: providerResponse.status,
            body: {
                // Hoist the most useful root fields
                id:       data?.id,
                object:   data?.object,
                status:   data?.status,
                // Full normalized payload
                data:     normalized,
                _god: {
                    provider:       meta.provider,
                    requestId:      meta.requestId,
                    responseTimeMs: meta.responseTimeMs,
                },
            },
        };
    }

    handleError(err) {
        if (err.response) {
            const data    = err.response.data;
            const strErr  = data?.error || {};

            const CODE_MAP = {
                'authentication_required':   'INVALID_PROVIDER_CREDENTIALS',
                'card_declined':             'PAYMENT_DECLINED',
                'insufficient_funds':        'PAYMENT_INSUFFICIENT_FUNDS',
                'invalid_request_error':     'PROVIDER_INVALID_REQUEST',
                'rate_limit':                'PROVIDER_RATE_LIMITED',
                'api_connection_error':      'PROVIDER_UNREACHABLE',
            };

            return {
                status:       err.response.status,
                message:      strErr.message || `Stripe returned HTTP ${err.response.status}`,
                code:         CODE_MAP[strErr.code] || CODE_MAP[strErr.type] || 'PROVIDER_ERROR',
                declineCode:  strErr.decline_code || null,
                upstream:     data,
            };
        }

        return super.handleError(err);
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Recursively convert nested objects to dot-notation for URLSearchParams.
     * e.g. { metadata: { key: 'val' } } → { 'metadata[key]': 'val' }
     */
    _flattenObject(obj, prefix = '') {
        return Object.entries(obj).reduce((acc, [key, val]) => {
            const fullKey = prefix ? `${prefix}[${key}]` : key;
            if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
                Object.assign(acc, this._flattenObject(val, fullKey));
            } else {
                acc[fullKey] = String(val);
            }
            return acc;
        }, {});
    }

    /**
     * Normalize amount fields (cents → dollars) in a Stripe response object.
     * Recurses into nested objects and arrays.
     */
    _normalizeAmounts(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this._normalizeAmounts(item));

        const AMOUNT_FIELDS = new Set(['amount', 'amount_due', 'amount_paid', 'amount_remaining',
                                       'subtotal', 'total', 'unit_amount', 'application_fee_amount']);

        return Object.entries(obj).reduce((acc, [key, val]) => {
            if (AMOUNT_FIELDS.has(key) && typeof val === 'number') {
                acc[key]            = val;                                           // raw cents
                acc[`${key}_formatted`] = `$${(val / 100).toFixed(2)}`;             // e.g. "$10.00"
            } else if (val && typeof val === 'object') {
                acc[key] = this._normalizeAmounts(val);
            } else {
                acc[key] = val;
            }
            return acc;
        }, {});
    }

    listTools() {
        return [
            {
                name: 'list_charges',
                description: 'List Stripe charges (amounts shown in cents AND formatted dollars)',
                endpoint: 'GET /v1/stripe/v1/charges',
                inputSchema: { type: 'object', properties: { limit: { type: 'integer', default: 10 }, starting_after: { type: 'string' } } },
                rateLimit: '100/min',
                authRequired: true,
            },
            {
                name: 'create_charge',
                description: 'Create a Stripe charge (body auto-converted from JSON → form-encoded)',
                endpoint: 'POST /v1/stripe/v1/charges',
                inputSchema: {
                    type: 'object',
                    required: ['amount', 'currency', 'source'],
                    properties: {
                        amount:      { type: 'integer', description: 'Amount in cents. e.g. 1000 = $10.00' },
                        currency:    { type: 'string', default: 'usd' },
                        source:      { type: 'string', description: 'Payment source token' },
                        description: { type: 'string' },
                    },
                },
                rateLimit: '100/min',
                authRequired: true,
            },
            {
                name: 'list_customers',
                description: 'List Stripe customers',
                endpoint: 'GET /v1/stripe/v1/customers',
                inputSchema: { type: 'object', properties: { limit: { type: 'integer', default: 10 }, email: { type: 'string' } } },
                rateLimit: '100/min',
                authRequired: true,
            },
            {
                name: 'create_payment_intent',
                description: 'Create a PaymentIntent',
                endpoint: 'POST /v1/stripe/v1/payment_intents',
                inputSchema: { type: 'object', required: ['amount', 'currency'], properties: { amount: { type: 'integer' }, currency: { type: 'string', default: 'usd' } } },
                rateLimit: '100/min',
                authRequired: true,
            },
        ];
    }
}

module.exports = StripeAdapter;
