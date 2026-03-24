/**
 * GOD API — GitHub Adapter
 *
 * transformRequest: injects GitHub API version header
 * transformResponse: promotes repo/user/issue key fields
 * handleError: maps GitHub status codes to GOD error codes
 */
const BaseProvider = require('./BaseProvider');

class GitHubAdapter extends BaseProvider {
    constructor() {
        super('https://api.github.com', {
            Authorization:          `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept:                 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        });

        this.name        = 'github';
        this.displayName = 'GitHub';
        this.description = 'Repos, issues, pull requests, users, and search via GitHub REST API.';
        this.baseUrl     = 'https://api.github.com';
        this.docsUrl     = 'https://docs.github.com/en/rest';
        this.version     = 'v1';
    }

    transformRequest({ method, path, body, query, headers }) {
        return {
            method,
            path,
            body,
            query,
            headers: {
                ...headers,
                Accept:                 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        };
    }

    transformResponse(providerResponse, meta) {
        const data = providerResponse.data;

        // Hoist key fields based on the response shape
        const promoted = {};
        if (data?.login)       promoted.login    = data.login;        // user
        if (data?.full_name)   promoted.fullName = data.full_name;    // repo
        if (data?.html_url)    promoted.url      = data.html_url;
        if (Array.isArray(data)) promoted.count  = data.length;       // lists

        return {
            status: providerResponse.status,
            body: {
                ...promoted,
                data,
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
            const data = err.response.data;

            const CODE_MAP = {
                401: 'INVALID_PROVIDER_CREDENTIALS',
                403: 'PROVIDER_FORBIDDEN',
                404: 'PROVIDER_RESOURCE_NOT_FOUND',
                422: 'PROVIDER_VALIDATION_ERROR',
                429: 'PROVIDER_RATE_LIMITED',
            };

            return {
                status:   err.response.status,
                message:  data?.message || `GitHub returned HTTP ${err.response.status}`,
                code:     CODE_MAP[err.response.status] || 'PROVIDER_ERROR',
                upstream: data,
            };
        }

        return super.handleError(err);
    }

    listTools() {
        return [
            { name: 'get_authenticated_user', description: 'Get authenticated GitHub user', endpoint: 'GET /v1/github/user', inputSchema: { type: 'object', properties: {} }, rateLimit: '5000/hr', authRequired: true },
            { name: 'get_repository', description: 'Get a GitHub repository', endpoint: 'GET /v1/github/repos/{owner}/{repo}', inputSchema: { type: 'object', required: ['owner', 'repo'], properties: { owner: { type: 'string' }, repo: { type: 'string' } } }, rateLimit: '5000/hr', authRequired: true },
            { name: 'list_issues', description: 'List repo issues', endpoint: 'GET /v1/github/repos/{owner}/{repo}/issues', inputSchema: { type: 'object', required: ['owner', 'repo'], properties: { owner: { type: 'string' }, repo: { type: 'string' }, state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' } } }, rateLimit: '5000/hr', authRequired: true },
            { name: 'search_repositories', description: 'Search GitHub repos', endpoint: 'GET /v1/github/search/repositories', inputSchema: { type: 'object', required: ['q'], properties: { q: { type: 'string' }, sort: { type: 'string', enum: ['stars', 'forks', 'updated'] } } }, rateLimit: '30/min', authRequired: true },
        ];
    }
}

module.exports = GitHubAdapter;
