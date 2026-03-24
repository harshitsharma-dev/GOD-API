/**
 * GOD API — GitHub Provider Adapter
 *
 * Proxies requests to https://api.github.com
 * Auth: Bearer token (GitHub Personal Access Token or OAuth token)
 *
 * Example routes:
 *   GET  /v1/github/user
 *   GET  /v1/github/repos/octocat/hello-world
 *   GET  /v1/github/repos/octocat/hello-world/issues
 *   GET  /v1/github/search/repositories?q=express
 */
const BaseProvider = require('./BaseProvider');

class GitHubProvider extends BaseProvider {
    constructor() {
        super('https://api.github.com', {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        });

        this.name = 'github';
        this.displayName = 'GitHub';
        this.description = 'Repos, issues, pull requests, users, and search via GitHub REST API.';
        this.baseUrl = 'https://api.github.com';
        this.docsUrl = 'https://docs.github.com/en/rest';
        this.version = 'v1';
    }

    listTools() {
        return [
            {
                name: 'get_authenticated_user',
                description: 'Get the authenticated GitHub user profile',
                endpoint: 'GET /v1/github/user',
                inputSchema: { type: 'object', properties: {} },
                rateLimit: '5000/hr',
                authRequired: true,
            },
            {
                name: 'get_repository',
                description: 'Get details of a specific GitHub repository',
                endpoint: 'GET /v1/github/repos/{owner}/{repo}',
                inputSchema: {
                    type: 'object',
                    required: ['owner', 'repo'],
                    properties: {
                        owner: { type: 'string', description: 'Repository owner username' },
                        repo: { type: 'string', description: 'Repository name' },
                    },
                },
                rateLimit: '5000/hr',
                authRequired: true,
            },
            {
                name: 'list_issues',
                description: 'List issues for a repository',
                endpoint: 'GET /v1/github/repos/{owner}/{repo}/issues',
                inputSchema: {
                    type: 'object',
                    required: ['owner', 'repo'],
                    properties: {
                        owner: { type: 'string' },
                        repo: { type: 'string' },
                        state: { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
                        per_page: { type: 'integer', default: 30, maximum: 100 },
                    },
                },
                rateLimit: '5000/hr',
                authRequired: true,
            },
            {
                name: 'search_repositories',
                description: 'Search GitHub repositories by keyword',
                endpoint: 'GET /v1/github/search/repositories',
                inputSchema: {
                    type: 'object',
                    required: ['q'],
                    properties: {
                        q: { type: 'string', description: 'Search query e.g. "express stars:>1000"' },
                        sort: { type: 'string', enum: ['stars', 'forks', 'updated'] },
                        per_page: { type: 'integer', default: 10, maximum: 100 },
                    },
                },
                rateLimit: '30/min',
                authRequired: true,
            },
        ];
    }
}

module.exports = GitHubProvider;
