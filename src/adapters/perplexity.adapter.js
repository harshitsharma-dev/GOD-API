const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class PerplexityAdapter extends BaseAdapter {
    constructor() {
        super('perplexity', process.env.PERPLEXITY_API_KEY);
    }

    async handleRequest(message) {
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
            return this.normalizeResponse(response.data.choices[0].message.content);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new PerplexityAdapter();
