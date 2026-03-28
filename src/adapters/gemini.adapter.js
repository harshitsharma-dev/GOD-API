const axios = require('axios');
const BaseAdapter = require('./base.adapter');

class GeminiAdapter extends BaseAdapter {
    constructor() {
        super('gemini', process.env.GEMINI_API_KEY);
    }

    async handleRequest(message) {
        const keyError = this.validateKey();
        if (keyError) return keyError;

        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
                {
                    contents: [{ parts: [{ text: message }] }],
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            return this.normalizeResponse(response.data.candidates[0].content.parts[0].text);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

module.exports = new GeminiAdapter();
