const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class OpenAIAdapter extends BaseAdapter {
    constructor() {
        super('openai', process.env.OPENAI_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4.1-mini',
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

module.exports = new OpenAIAdapter();
