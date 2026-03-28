const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class TogetherAdapter extends BaseAdapter {
    constructor() {
        super('together', process.env.TOGETHER_API_KEY);
    }

    async handleRequest(message) {
        try {
            const response = await axios.post(
                'https://api.together.xyz/v1/chat/completions',
                {
                    model: 'meta-llama/Llama-Vision-Free',
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

module.exports = new TogetherAdapter();
