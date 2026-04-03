const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class ClaudeAdapter extends BaseAdapter {
    constructor() {
        super('claude', process.env.CLAUDE_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

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

            const content = response.data.content[0].text;
            const usage = response.data.usage;
            const tokens = usage ? {
                prompt: usage.input_tokens,
                completion: usage.output_tokens,
                total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
            } : {
                prompt: this.estimateTokens(message),
                completion: this.estimateTokens(content),
                total: this.estimateTokens(message) + this.estimateTokens(content)
            };

            return this.normalizeResponse(content, tokens);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new ClaudeAdapter();
