/**
 * GOD API — OpenAI Provider Adapter
 *
 * Proxies all requests to https://api.openai.com
 * Auth: Bearer token (your OPENAI_API_KEY env var)
 *
 * Example routes:
 *   POST /v1/openai/v1/chat/completions
 *   GET  /v1/openai/v1/models
 *   POST /v1/openai/v1/embeddings
 *   POST /v1/openai/v1/images/generations
 */
const BaseProvider = require('./BaseProvider');

class OpenAIProvider extends BaseProvider {
    constructor() {
        super('https://api.openai.com', {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        });

        this.name = 'openai';
        this.displayName = 'OpenAI';
        this.description = 'Access GPT models, embeddings, DALL-E image generation, and more.';
        this.baseUrl = 'https://api.openai.com';
        this.docsUrl = 'https://platform.openai.com/docs';
        this.version = 'v1';
    }

    /**
     * MCP-style tool definitions — used by the discovery endpoint.
     * GET /v1/_/providers/openai/tools
     */
    listTools() {
        return [
            {
                name: 'chat_completion',
                description: 'Generate a chat completion using GPT models (GPT-4, GPT-3.5-turbo, etc.)',
                endpoint: 'POST /v1/openai/v1/chat/completions',
                inputSchema: {
                    type: 'object',
                    required: ['model', 'messages'],
                    properties: {
                        model: { type: 'string', example: 'gpt-4o', description: 'Model ID' },
                        messages: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                                    content: { type: 'string' },
                                },
                            },
                        },
                        temperature: { type: 'number', minimum: 0, maximum: 2, default: 1 },
                        max_tokens: { type: 'integer' },
                        stream: { type: 'boolean', default: false },
                    },
                },
                rateLimit: '60/min',
                authRequired: true,
            },
            {
                name: 'list_models',
                description: 'List all available OpenAI models',
                endpoint: 'GET /v1/openai/v1/models',
                inputSchema: { type: 'object', properties: {} },
                rateLimit: '60/min',
                authRequired: true,
            },
            {
                name: 'create_embedding',
                description: 'Generate vector embeddings for text',
                endpoint: 'POST /v1/openai/v1/embeddings',
                inputSchema: {
                    type: 'object',
                    required: ['input', 'model'],
                    properties: {
                        input: { type: 'string', description: 'Text to embed' },
                        model: { type: 'string', example: 'text-embedding-ada-002' },
                    },
                },
                rateLimit: '60/min',
                authRequired: true,
            },
            {
                name: 'generate_image',
                description: 'Generate images with DALL-E 3',
                endpoint: 'POST /v1/openai/v1/images/generations',
                inputSchema: {
                    type: 'object',
                    required: ['prompt'],
                    properties: {
                        prompt: { type: 'string', description: 'Image description' },
                        model: { type: 'string', default: 'dall-e-3' },
                        n: { type: 'integer', default: 1, minimum: 1, maximum: 10 },
                        size: {
                            type: 'string',
                            enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
                            default: '1024x1024',
                        },
                    },
                },
                rateLimit: '15/min',
                authRequired: true,
            },
        ];
    }
}

module.exports = OpenAIProvider;
