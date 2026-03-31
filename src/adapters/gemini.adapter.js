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

            const content = response.data.candidates[0].content.parts[0].text;
            const meta = response.data.usageMetadata;
            const tokens = meta ? {
                prompt: meta.promptTokenCount ?? this.estimateTokens(message),
                completion: meta.candidatesTokenCount ?? this.estimateTokens(content),
                total: meta.totalTokenCount ?? (meta.promptTokenCount + meta.candidatesTokenCount)
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

module.exports = new GeminiAdapter();
