const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class ClaudeAdapter extends BaseAdapter {
    constructor() {
        super('claude', process.env.CLAUDE_API_KEY);
    }

    async handleRequest(message) {
        try {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: message }],
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json',
                    },
                }
            );
            return this.normalizeResponse(response.data.content[0].text);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new ClaudeAdapter();
