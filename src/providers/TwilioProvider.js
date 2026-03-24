/**
 * GOD API — Twilio Provider Adapter
 *
 * Proxies requests to https://api.twilio.com
 * Auth: HTTP Basic Auth (AccountSID:AuthToken)
 *
 * Example routes:
 *   POST /v1/twilio/2010-04-01/Accounts/{AccountSid}/Messages.json
 *   GET  /v1/twilio/2010-04-01/Accounts/{AccountSid}/Messages.json
 *
 * Note: Twilio uses its own versioned URL structure (2010-04-01).
 * The entire path after /v1/twilio/ is forwarded as-is.
 */
const BaseProvider = require('./BaseProvider');

class TwilioProvider extends BaseProvider {
    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        // Twilio uses HTTP Basic Auth: accountSid:authToken
        const encoded = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        super('https://api.twilio.com', {
            Authorization: `Basic ${encoded}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        });

        this.name = 'twilio';
        this.displayName = 'Twilio';
        this.description = 'Send SMS, WhatsApp messages, make voice calls via Twilio.';
        this.baseUrl = 'https://api.twilio.com';
        this.docsUrl = 'https://www.twilio.com/docs/usage/api';
        this.version = '2010-04-01';
    }

    listTools() {
        const sid = process.env.TWILIO_ACCOUNT_SID || '{AccountSid}';
        return [
            {
                name: 'send_sms',
                description: 'Send an SMS message via Twilio',
                endpoint: `POST /v1/twilio/2010-04-01/Accounts/${sid}/Messages.json`,
                inputSchema: {
                    type: 'object',
                    required: ['To', 'From', 'Body'],
                    properties: {
                        To: { type: 'string', description: 'Recipient phone number in E.164 format, e.g. +14155238886' },
                        From: { type: 'string', description: 'Twilio phone number in E.164 format' },
                        Body: { type: 'string', description: 'SMS message body (max 1600 chars)' },
                    },
                },
                rateLimit: '100/sec',
                authRequired: true,
            },
            {
                name: 'list_messages',
                description: 'List all sent/received messages',
                endpoint: `GET /v1/twilio/2010-04-01/Accounts/${sid}/Messages.json`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        PageSize: { type: 'integer', default: 20, maximum: 1000 },
                        To: { type: 'string', description: 'Filter by recipient number' },
                        From: { type: 'string', description: 'Filter by sender number' },
                    },
                },
                rateLimit: '100/sec',
                authRequired: true,
            },
        ];
    }
}

module.exports = TwilioProvider;
