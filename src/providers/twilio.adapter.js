/**
 * GOD API — Twilio Adapter
 *
 * transformRequest: converts JSON → form-encoded (Twilio's requirement)
 * transformResponse: promotes sid, status, to, from for SMS confirmations
 * handleError: maps Twilio error codes to GOD codes
 */
const BaseProvider = require('./BaseProvider');
const { URLSearchParams } = require('url');

class TwilioAdapter extends BaseProvider {
    constructor() {
        const sid     = process.env.TWILIO_ACCOUNT_SID;
        const token   = process.env.TWILIO_AUTH_TOKEN;
        const encoded = Buffer.from(`${sid}:${token}`).toString('base64');

        super('https://api.twilio.com', {
            Authorization:  `Basic ${encoded}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        });

        this.name        = 'twilio';
        this.displayName = 'Twilio';
        this.description = 'Send SMS, WhatsApp messages, make voice calls via Twilio.';
        this.baseUrl     = 'https://api.twilio.com';
        this.docsUrl     = 'https://www.twilio.com/docs/usage/api';
        this.version     = '2010-04-01';
    }

    transformRequest({ method, path, body, query, headers }) {
        let transformedBody = body;

        // Twilio POST endpoints always expect form-encoded data
        if (['POST', 'PUT'].includes(method.toUpperCase()) && body && typeof body === 'object') {
            transformedBody = new URLSearchParams(body).toString();
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

        return {
            status: providerResponse.status,
            body: {
                // Hoist key SMS fields
                sid:       data?.sid,
                status:    data?.status,
                to:        data?.to,
                from:      data?.from,
                body:      data?.body,
                direction: data?.direction,
                // Full payload
                data,
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
            const data = err.response.data;

            const CODE_MAP = {
                20003: 'INVALID_PROVIDER_CREDENTIALS',  // Authentication failed
                20429: 'PROVIDER_RATE_LIMITED',          // Too many requests
                21211: 'PROVIDER_INVALID_PHONE_NUMBER',  // Invalid To
                21608: 'PROVIDER_UNVERIFIED_NUMBER',     // Trial account restriction
            };

            return {
                status:   err.response.status,
                message:  data?.message || `Twilio returned HTTP ${err.response.status}`,
                code:     CODE_MAP[data?.code] || 'PROVIDER_ERROR',
                twilioCode: data?.code || null,
                upstream: data,
            };
        }

        return super.handleError(err);
    }

    listTools() {
        const sid = process.env.TWILIO_ACCOUNT_SID || '{AccountSid}';
        return [
            { name: 'send_sms', description: 'Send an SMS (body JSON auto-converted to form-encoded)', endpoint: `POST /v1/twilio/2010-04-01/Accounts/${sid}/Messages.json`, inputSchema: { type: 'object', required: ['To', 'From', 'Body'], properties: { To: { type: 'string' }, From: { type: 'string' }, Body: { type: 'string' } } }, rateLimit: '100/sec', authRequired: true },
            { name: 'list_messages', description: 'List sent/received messages', endpoint: `GET /v1/twilio/2010-04-01/Accounts/${sid}/Messages.json`, inputSchema: { type: 'object', properties: { PageSize: { type: 'integer', default: 20 }, To: { type: 'string' }, From: { type: 'string' } } }, rateLimit: '100/sec', authRequired: true },
        ];
    }
}

module.exports = TwilioAdapter;
