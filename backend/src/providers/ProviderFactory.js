/**
 * GOD API — Provider Factory
 *
 * Central registry of all AI providers.
 * Used by discovery endpoints and dashboard to list available providers.
 */

const providers = [
    {
        name: 'gemini',
        displayName: 'Google Gemini',
        description: 'Google\'s Gemini 2.0 Flash model for fast, general-purpose AI.',
        baseUrl: 'https://generativelanguage.googleapis.com',
        docsUrl: 'https://ai.google.dev/docs',
        version: '2.0',
        listTools: () => [{ name: 'generateContent', description: 'Generate text from a prompt' }],
    },
    {
        name: 'openai',
        displayName: 'OpenAI',
        description: 'GPT-4.1-mini for high-quality chat completions.',
        baseUrl: 'https://api.openai.com',
        docsUrl: 'https://platform.openai.com/docs',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Generate chat completions' }],
    },
    {
        name: 'claude',
        displayName: 'Anthropic Claude',
        description: 'Claude 3.5 Sonnet for safe, nuanced AI responses.',
        baseUrl: 'https://api.anthropic.com',
        docsUrl: 'https://docs.anthropic.com',
        version: '1.0',
        listTools: () => [{ name: 'messages', description: 'Create AI messages' }],
    },
    {
        name: 'groq',
        displayName: 'Groq',
        description: 'Ultra-fast inference with Llama 3.3 70B.',
        baseUrl: 'https://api.groq.com',
        docsUrl: 'https://console.groq.com/docs',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Fast chat completions' }],
    },
    {
        name: 'mistral',
        displayName: 'Mistral AI',
        description: 'Mistral Small for efficient, multilingual AI.',
        baseUrl: 'https://api.mistral.ai',
        docsUrl: 'https://docs.mistral.ai',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Multilingual chat completions' }],
    },
    {
        name: 'deepseek',
        displayName: 'DeepSeek',
        description: 'DeepSeek Chat model for coding and reasoning.',
        baseUrl: 'https://api.deepseek.com',
        docsUrl: 'https://platform.deepseek.com/docs',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Code-focused chat completions' }],
    },
    {
        name: 'openrouter',
        displayName: 'OpenRouter',
        description: 'Access multiple models through a unified API.',
        baseUrl: 'https://openrouter.ai',
        docsUrl: 'https://openrouter.ai/docs',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Multi-model chat completions' }],
    },
    {
        name: 'replicate',
        displayName: 'Replicate',
        description: 'Run open-source models with async predictions.',
        baseUrl: 'https://api.replicate.com',
        docsUrl: 'https://replicate.com/docs',
        version: '1.0',
        listTools: () => [{ name: 'predictions', description: 'Run model predictions' }],
    },
    {
        name: 'together',
        displayName: 'Together AI',
        description: 'Llama Vision Free model for fast inference.',
        baseUrl: 'https://api.together.xyz',
        docsUrl: 'https://docs.together.ai',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Open-source model inference' }],
    },
    {
        name: 'huggingface',
        displayName: 'HuggingFace',
        description: 'Mistral 7B Instruct via HuggingFace Inference API.',
        baseUrl: 'https://router.huggingface.co',
        docsUrl: 'https://huggingface.co/docs',
        version: '1.0',
        listTools: () => [{ name: 'inference', description: 'Model inference endpoint' }],
    },
    {
        name: 'perplexity',
        displayName: 'Perplexity AI',
        description: 'Online-augmented AI model with real-time data.',
        baseUrl: 'https://api.perplexity.ai',
        docsUrl: 'https://docs.perplexity.ai',
        version: '1.0',
        listTools: () => [{ name: 'chatCompletion', description: 'Online-augmented completions' }],
    },
];

class ProviderFactory {
    static listProviders() {
        return providers.map(p => ({
            name: p.name,
            displayName: p.displayName,
            description: p.description,
        }));
    }

    static getProvider(name) {
        const provider = providers.find(p => p.name === name.toLowerCase());
        if (!provider) {
            const err = new Error(`Provider '${name}' not found`);
            err.statusCode = 404;
            throw err;
        }
        return provider;
    }
}

module.exports = ProviderFactory;
