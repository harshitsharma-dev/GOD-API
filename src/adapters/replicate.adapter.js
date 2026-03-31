const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class ReplicateAdapter extends BaseAdapter {
    constructor() {
        super('replicate', process.env.REPLICATE_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

        try {
            // Using Mistral 7B on Replicate as a stable chat model
            const response = await axios.post('https://api.replicate.com/v1/predictions', {
                version: 'mistralai/mistral-7b-instruct-v0.2',
                input: { prompt: message, max_new_tokens: 500 }
            }, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Replicate predictions are often async. We'll poll for the result.
            let predictionId = response.data.id;
            let status = response.data.status;
            let result = response.data;

            // Simple polling for a few seconds
            let attempts = 0;
            while ((status !== 'succeeded' && status !== 'failed') && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const pollResponse = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                    headers: { 'Authorization': `Token ${this.apiKey}` }
                });
                result = pollResponse.data;
                status = result.status;
                attempts++;
            }

            if (status === 'succeeded') {
                const content = Array.isArray(result.output) ? result.output.join('') : result.output;
                const tokens = {
                    prompt: this.estimateTokens(message),
                    completion: this.estimateTokens(content),
                    total: this.estimateTokens(message) + this.estimateTokens(content)
                };
                return this.normalizeResponse(content, tokens);
            } else {
                throw new Error(`Replicate prediction ${status}`);
            }
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new ReplicateAdapter();
