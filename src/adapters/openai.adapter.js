const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class OpenAIAdapter extends BaseAdapter {
    constructor() {
        super('openai', process.env.OPENAI_API_KEY);
    }

    async handleRequest(message) {
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
            return this.normalizeResponse(response.data.choices[0].message.content);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new OpenAIAdapter();
