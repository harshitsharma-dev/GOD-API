const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class OpenRouterAdapter extends BaseAdapter {
    constructor() {
        super('openrouter', process.env.OPENROUTER_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'stepfun/step-1.5-flash:free',
                messages: [{ role: 'user', content: message }]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://github.com/harshitsharma-dev/GOD-API',
                    'X-Title': 'GOD API Gateway'
                }
            });

            if (!response.data.choices || response.data.choices.length === 0) {
              throw new Error("No response choices from OpenRouter");
            }

            return this.normalizeResponse(response.data.choices[0].message.content);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new OpenRouterAdapter();
