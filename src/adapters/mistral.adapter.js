const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class MistralAdapter extends BaseAdapter {
    constructor() {
        super('mistral', process.env.MISTRAL_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

        try {
            const response = await axios.post(
                'https://api.mistral.ai/v1/chat/completions',
                {
                    model: 'mistral-small-latest',
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

module.exports = new MistralAdapter();
