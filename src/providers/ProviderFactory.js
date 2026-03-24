/**
 * GOD API — Provider Factory (v2)
 *
 * Updated to use the new .adapter.js files which implement the full
 * adapter interface: transformRequest / transformResponse / handleError.
 *
 * The old *Provider.js files are kept for backwards compatibility but
 * the factory now points to the .adapter.js versions exclusively.
 *
 * To add a new provider:
 *   1. Create /src/providers/yourname.adapter.js extending BaseProvider
 *   2. Import it here and add a REGISTRY entry
 *   That's all — routing, discovery, auth, and rate limiting are automatic.
 */
const OpenAIAdapter     = require('./openai.adapter');
const StripeAdapter     = require('./stripe.adapter');
const GitHubAdapter     = require('./github.adapter');
const TwilioAdapter     = require('./twilio.adapter');
const GoogleMapsAdapter = require('./googlemaps.adapter');

// ── Provider Registry ──────────────────────────────────────────────────────
// key:   URL slug used in /v1/:provider/...
// value: lazy constructor (instantiated once on first use)
const REGISTRY = {
    'openai':       () => new OpenAIAdapter(),
    'stripe':       () => new StripeAdapter(),
    'github':       () => new GitHubAdapter(),
    'twilio':       () => new TwilioAdapter(),
    'google-maps':  () => new GoogleMapsAdapter(),
};

// Singleton cache — adapters are stateless, so one instance per process is fine
const _instances = {};

class ProviderFactory {
    /**
     * Get (or create) a provider adapter by slug.
     *
     * @param {string} name  e.g. 'openai', 'stripe', 'google-maps'
     * @returns {BaseProvider}
     * @throws {{ status: 404, message: string }}
     */
    static getProvider(name) {
        const key = name.toLowerCase();

        if (!REGISTRY[key]) {
            const supported = Object.keys(REGISTRY).join(', ');
            const err = new Error(`Provider '${name}' is not supported. Available: ${supported}`);
            err.status = 404;
            err.code   = 'UNKNOWN_PROVIDER';
            throw err;
        }

        if (!_instances[key]) {
            _instances[key] = REGISTRY[key]();
        }

        return _instances[key];
    }

    /**
     * List all registered providers with metadata + tool counts.
     * Powers GET /v1/_/providers
     */
    static listProviders() {
        return Object.keys(REGISTRY).map((key) => {
            const p = ProviderFactory.getProvider(key);
            return {
                name:        p.name,
                displayName: p.displayName,
                description: p.description,
                baseUrl:     p.baseUrl,
                docsUrl:     p.docsUrl,
                version:     p.version,
                toolCount:   p.listTools().length,
                // Expose which interface methods are custom-implemented
                adapterMethods: {
                    transformRequest:  p.transformRequest !== ProviderFactory._baseTR,
                    transformResponse: p.transformResponse !== ProviderFactory._baseTRes,
                    handleError:       p.handleError       !== ProviderFactory._baseHE,
                },
            };
        });
    }

    /** @param {string} name */
    static isSupported(name) {
        return !!REGISTRY[name?.toLowerCase()];
    }
}

// Stash base method references for the adapterMethods introspection above
const BaseProvider = require('./BaseProvider');
ProviderFactory._baseTR   = BaseProvider.prototype.transformRequest;
ProviderFactory._baseTRes  = BaseProvider.prototype.transformResponse;
ProviderFactory._baseHE   = BaseProvider.prototype.handleError;

module.exports = ProviderFactory;
