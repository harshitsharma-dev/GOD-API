const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class HuggingFaceAdapter extends BaseAdapter {
    constructor() {
        super('huggingface', process.env.HUGGINGFACE_API_KEY);
    }

    async handleRequest(message) {
        try {
            const response = await axios.post(
                'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
                {
                    inputs: message,
                    parameters: {
                        return_full_text: false,
                        max_new_tokens: 500
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            const result = Array.isArray(response.data) ? response.data[0].generated_text : response.data.generated_text;
            return this.normalizeResponse(result);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new HuggingFaceAdapter();
