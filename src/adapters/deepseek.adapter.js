const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class DeepSeekAdapter extends BaseAdapter {
    constructor() {
        super('deepseek', process.env.DEEPSEEK_API_KEY);
    }

    async handleRequest(message) {
        try {
            const response = await axios.post(
                'https://api.deepseek.com/chat/completions',
                {
                    model: 'deepseek-chat',
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

module.exports = new DeepSeekAdapter();
