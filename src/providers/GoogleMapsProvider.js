/**
 * GOD API — Google Maps Provider Adapter
 *
 * Proxies requests to https://maps.googleapis.com
 * Auth: API key passed as query parameter (Google Maps convention)
 *
 * Example routes:
 *   GET /v1/google-maps/maps/api/geocode/json?address=New+York
 *   GET /v1/google-maps/maps/api/directions/json?origin=NY&destination=LA
 *   GET /v1/google-maps/maps/api/place/textsearch/json?query=restaurants+in+NYC
 */
const BaseProvider = require('./BaseProvider');

class GoogleMapsProvider extends BaseProvider {
    constructor() {
        super('https://maps.googleapis.com', {
            'Content-Type': 'application/json',
        });

        this.name = 'google-maps';
        this.displayName = 'Google Maps';
        this.description = 'Geocoding, directions, places, distance matrix via Google Maps Platform.';
        this.baseUrl = 'https://maps.googleapis.com';
        this.docsUrl = 'https://developers.google.com/maps/documentation';
        this.version = 'v1';
    }

    /**
     * Override forwardRequest to inject the API key into every request's
     * query params — this is Google Maps' authentication convention.
     */
    async forwardRequest(method, path, data = {}, params = {}, headers = {}) {
        const enrichedParams = {
            key: process.env.GOOGLE_MAPS_API_KEY,
            ...params,
        };
        return super.forwardRequest(method, path, data, enrichedParams, headers);
    }

    listTools() {
        return [
            {
                name: 'geocode',
                description: 'Convert a human-readable address into geographic coordinates',
                endpoint: 'GET /v1/google-maps/maps/api/geocode/json',
                inputSchema: {
                    type: 'object',
                    properties: {
                        address: { type: 'string', description: 'Address to geocode, e.g. "1600 Amphitheatre Parkway, Mountain View, CA"' },
                        latlng: { type: 'string', description: 'Reverse geocode lat/lng, e.g. "40.714224,-73.961452"' },
                    },
                },
                rateLimit: '50/sec',
                authRequired: true,
            },
            {
                name: 'directions',
                description: 'Get directions between two locations',
                endpoint: 'GET /v1/google-maps/maps/api/directions/json',
                inputSchema: {
                    type: 'object',
                    required: ['origin', 'destination'],
                    properties: {
                        origin: { type: 'string', description: 'Start location address or lat,lng' },
                        destination: { type: 'string', description: 'End location address or lat,lng' },
                        mode: { type: 'string', enum: ['driving', 'walking', 'bicycling', 'transit'], default: 'driving' },
                    },
                },
                rateLimit: '50/sec',
                authRequired: true,
            },
            {
                name: 'place_search',
                description: 'Search for places by text query',
                endpoint: 'GET /v1/google-maps/maps/api/place/textsearch/json',
                inputSchema: {
                    type: 'object',
                    required: ['query'],
                    properties: {
                        query: { type: 'string', description: 'Search text, e.g. "restaurants in Mumbai"' },
                        radius: { type: 'integer', description: 'Search radius in meters (max 50000)' },
                    },
                },
                rateLimit: '50/sec',
                authRequired: true,
            },
            {
                name: 'distance_matrix',
                description: 'Calculate travel distance and time between points',
                endpoint: 'GET /v1/google-maps/maps/api/distancematrix/json',
                inputSchema: {
                    type: 'object',
                    required: ['origins', 'destinations'],
                    properties: {
                        origins: { type: 'string', description: 'Pipe-separated origins e.g. "New York|Boston"' },
                        destinations: { type: 'string', description: 'Pipe-separated destinations' },
                        mode: { type: 'string', enum: ['driving', 'walking', 'transit'], default: 'driving' },
                    },
                },
                rateLimit: '50/sec',
                authRequired: true,
            },
        ];
    }
}

module.exports = GoogleMapsProvider;
