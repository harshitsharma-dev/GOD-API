class BaseAdapter {
    constructor(providerName, apiKey) {
        this.providerName = providerName;
        this.apiKey = apiKey;
    }

    async handleRequest(message) {
        throw new Error('Method "handleUserRequest" must be implemented');
    }

    /**
     * Standardized empty tokens object.
     */
    get emptyTokens() {
        return { prompt: 0, completion: 0, total: 0 };
    }

    validateKey() {
        if (!this.apiKey) {
            return {
                success: false,
                provider: this.providerName,
                error: "API key missing",
                tokens: this.emptyTokens
            };
        }
        return null;
    }

    /**
     * Estimate token count from text using ~4 chars per token heuristic.
     * Used as fallback when provider doesn't return exact token counts.
     * @param {string} text
     * @returns {number}
     */
    estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(String(text).length / 4);
    }

    /**
     * Normalize response with optional token tracking.
     * @param {*} data - The response content
     * @param {object|null} tokens - { prompt, completion, total } or null
     */
    normalizeResponse(data, tokens = null) {
        return {
            success: true,
            provider: this.providerName,
            data: { message: data },
            tokens: tokens || this.emptyTokens
        };
    }

    handleError(error) {
        const errorMsg = error.response?.data 
            ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data)
            : error.message;

        return {
            success: false,
            provider: this.providerName,
            error: errorMsg,
            tokens: this.emptyTokens
        };
    }
}


module.exports = BaseAdapter;
