/**
 * GOD API — OpenAI Adapter
 *
 * Adapter pipeline for https://api.openai.com
 *
 * transformRequest:
 *   - Ensures Content-Type is set (OpenAI strictly requires application/json)
 *   - Strips query params from POST calls (OpenAI doesn't use them)
 *
 * transformResponse:
 *   - Promotes the most useful fields to the top level for tenant convenience
 *   - Keeps the full upstream payload under `raw`
 *
 * handleError:
 *   - Extracts OpenAI's error.message + error.type + error.code fields
 *   - Maps common OpenAI errors to GOD error codes
 */
const BaseProvider = require('./BaseProvider');

class OpenAIAdapter extends BaseProvider {
    constructor() {
        super('https://api.openai.com', {
            Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        });

        this.name        = 'openai';
        this.displayName = 'OpenAI';
        this.description = 'Access GPT models, embeddings, DALL-E image generation, and more.';
        this.baseUrl     = 'https://api.openai.com';
        this.docsUrl     = 'https://platform.openai.com/docs';
        this.version     = 'v1';
    }

    // ── Adapter Interface ────────────────────────────────────────────────────

    transformRequest({ method, path, body, query, headers }) {
        // OpenAI uses JSON bodies for all POST requests — enforce it
        const transformedHeaders = {
            ...headers,
            'Content-Type': 'application/json',
        };

        // For GET requests (e.g. /v1/models), query params are fine
        // For POST requests, OpenAI ignores query params — keep them empty
        const transformedQuery = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())
            ? {}
            : query;

        return {
            method,
            path,
            body,
            query:   transformedQuery,
            headers: transformedHeaders,
        };
    }

    transformResponse(providerResponse, meta) {
        const data = providerResponse.data;

        // Promote convenience fields based on response shape
        const promoted = {};

        // Chat completions — hoist the first choice's content
        if (data?.choices?.[0]?.message?.content !== undefined) {
            promoted.answer  = data.choices[0].message.content;
            promoted.model   = data.model;
            promoted.usage   = data.usage;
            promoted.finish  = data.choices[0].finish_reason;
        }

        // Embeddings — hoist the first embedding vector
        if (data?.data?.[0]?.embedding) {
            promoted.embedding = data.data[0].embedding;
            promoted.model     = data.model;
            promoted.usage     = data.usage;
        }

        // Image generation — hoist image URLs
        if (data?.data?.[0]?.url) {
            promoted.images = data.data.map(img => img.url);
        }

        return {
            status: providerResponse.status,
            body: {
                ...promoted,                    // Hoisted convenience fields at the top
                raw: data,                      // Full upstream response for power users
                _god: {
                    provider:       meta.provider,
                    requestId:      meta.requestId,
                    responseTimeMs: meta.responseTimeMs,
                },
            },
        };
    }

    handleError(err) {
        if (err.response) {
            const data  = err.response.data;
            const oaErr = data?.error || {};

            // Map OpenAI error types to GOD error codes
            const CODE_MAP = {
                'invalid_api_key':       'INVALID_PROVIDER_CREDENTIALS',
                'insufficient_quota':    'PROVIDER_QUOTA_EXCEEDED',
                'model_not_found':       'PROVIDER_RESOURCE_NOT_FOUND',
                'rate_limit_exceeded':   'PROVIDER_RATE_LIMITED',
                'context_length_exceeded': 'PROVIDER_REQUEST_TOO_LARGE',
            };

            return {
                status:   err.response.status,
                message:  oaErr.message || `OpenAI returned HTTP ${err.response.status}`,
                code:     CODE_MAP[oaErr.code] || CODE_MAP[oaErr.type] || 'PROVIDER_ERROR',
                upstream: data,
            };
        }

        return super.handleError(err);
    }

    // ── Tool Discovery ────────────────────────────────────────────────────────
    listTools() {
        return [
            {
                name: 'chat_completion',
                description: 'Generate a chat completion using GPT models (GPT-4o, GPT-4, GPT-3.5-turbo, etc.)',
                endpoint: 'POST /v1/openai/v1/chat/completions',
                inputSchema: {
                    type: 'object',
                    required: ['model', 'messages'],
                    properties: {
                        model:       { type: 'string', example: 'gpt-4o' },
                        messages:    { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['system', 'user', 'assistant'] }, content: { type: 'string' } } } },
                        temperature: { type: 'number', minimum: 0, maximum: 2, default: 1 },
                        max_tokens:  { type: 'integer' },
                        stream:      { type: 'boolean', default: false },
                    },
                },
                rateLimit: '20/min',
                authRequired: true,
            },
            {
                name: 'list_models',
                description: 'List all available OpenAI models',
                endpoint: 'GET /v1/openai/v1/models',
                inputSchema: { type: 'object', properties: {} },
                rateLimit: '20/min',
                authRequired: true,
            },
            {
                name: 'create_embedding',
                description: 'Generate vector embeddings for text (returns array at root level for convenience)',
                endpoint: 'POST /v1/openai/v1/embeddings',
                inputSchema: {
                    type: 'object',
                    required: ['input', 'model'],
                    properties: {
                        input: { type: 'string' },
                        model: { type: 'string', example: 'text-embedding-ada-002' },
                    },
                },
                rateLimit: '20/min',
                authRequired: true,
            },
            {
                name: 'generate_image',
                description: 'Generate images with DALL-E 3 (image URLs returned at root as `images[]`)',
                endpoint: 'POST /v1/openai/v1/images/generations',
                inputSchema: {
                    type: 'object',
                    required: ['prompt'],
                    properties: {
                        prompt: { type: 'string' },
                        model:  { type: 'string', default: 'dall-e-3' },
                        n:      { type: 'integer', default: 1 },
                        size:   { type: 'string', default: '1024x1024' },
                    },
                },
                rateLimit: '15/min',
                authRequired: true,
            },
        ];
    }
}

module.exports = OpenAIAdapter;
