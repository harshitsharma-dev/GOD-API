class BaseAdapter {
    constructor(providerName, apiKey) {
        this.providerName = providerName;
        this.apiKey = apiKey;
    }

    async handleRequest(message) {
        throw new Error('Method "handleUserRequest" must be implemented');
    }

    validateKey() {
        if (!this.apiKey) {
            return {
                success: false,
                provider: this.providerName,
                error: "API key missing"
            };
        }
        return null;
    }



    normalizeResponse(data) {
        return {
            success: true,
            provider: this.providerName,
            data: data
        };
    }

    handleError(error) {
        const errorMsg = error.response?.data 
            ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data)
            : error.message;

        return {
            success: false,
            provider: this.providerName,
            error: errorMsg
        };
    }
}


module.exports = BaseAdapter;
