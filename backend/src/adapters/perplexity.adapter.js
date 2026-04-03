const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class PerplexityAdapter extends BaseAdapter {
    constructor() {
        super('perplexity', process.env.PERPLEXITY_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

        try {
            const response = await axios.post(
                'https://api.perplexity.ai/chat/completions',
                {
                    model: 'pplx-7b-online',
                    messages: [{ role: 'user', content: message }],
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const content = response.data.choices[0].message.content;
            const usage = response.data.usage;
            const tokens = usage ? {
                prompt: usage.prompt_tokens,
                completion: usage.completion_tokens,
                total: usage.total_tokens
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

module.exports = new PerplexityAdapter();
