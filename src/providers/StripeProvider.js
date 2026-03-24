/**
 * GOD API — Stripe Provider Adapter
 *
 * Proxies all requests to https://api.stripe.com
 * Auth: Basic auth with API key as username (Stripe convention)
 *
 * Example routes:
 *   GET  /v1/stripe/v1/charges
 *   POST /v1/stripe/v1/charges
 *   GET  /v1/stripe/v1/customers
 *   POST /v1/stripe/v1/payment_intents
 */
const BaseProvider = require('./BaseProvider');

class StripeProvider extends BaseProvider {
    constructor() {
        // Stripe uses HTTP Basic Auth: "Authorization: Basic base64(sk_live_xxx:)"
        const encodedKey = Buffer.from(`${process.env.STRIPE_SECRET_KEY}:`).toString('base64');
        super('https://api.stripe.com', {
            Authorization: `Basic ${encodedKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        });

        this.name = 'stripe';
        this.displayName = 'Stripe';
        this.description = 'Payments, subscriptions, billing, customer management via Stripe APIs.';
        this.baseUrl = 'https://api.stripe.com';
        this.docsUrl = 'https://stripe.com/docs/api';
        this.version = 'v1';
    }

    listTools() {
        return [
            {
                name: 'list_charges',
                description: 'List all Stripe charges with optional pagination',
                endpoint: 'GET /v1/stripe/v1/charges',
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer', default: 10, maximum: 100 },
                        starting_after: { type: 'string', description: 'Cursor for pagination' },
                    },
                },
                rateLimit: '100/min',
                authRequired: true,
            },
            {
                name: 'create_charge',
                description: 'Create a new Stripe payment charge',
                endpoint: 'POST /v1/stripe/v1/charges',
                inputSchema: {
                    type: 'object',
                    required: ['amount', 'currency', 'source'],
                    properties: {
                        amount: { type: 'integer', description: 'Amount in cents. e.g. 1000 = $10.00' },
                        currency: { type: 'string', default: 'usd', example: 'usd' },
                        source: { type: 'string', description: 'Token from Stripe.js, e.g. tok_visa' },
                        description: { type: 'string' },
                    },
                },
                rateLimit: '100/min',
                authRequired: true,
            },
            {
                name: 'list_customers',
                description: 'List all Stripe customers',
                endpoint: 'GET /v1/stripe/v1/customers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer', default: 10 },
                        email: { type: 'string', description: 'Filter by email address' },
                    },
                },
                rateLimit: '100/min',
                authRequired: true,
            },
            {
                name: 'create_payment_intent',
                description: 'Create a PaymentIntent for collecting payments',
                endpoint: 'POST /v1/stripe/v1/payment_intents',
                inputSchema: {
                    type: 'object',
                    required: ['amount', 'currency'],
                    properties: {
                        amount: { type: 'integer', description: 'Amount in smallest currency unit' },
                        currency: { type: 'string', default: 'usd' },
                        payment_method_types: {
                            type: 'array',
                            items: { type: 'string' },
                            default: ['card'],
                        },
                    },
                },
                rateLimit: '100/min',
                authRequired: true,
            },
        ];
    }
}

module.exports = StripeProvider;
