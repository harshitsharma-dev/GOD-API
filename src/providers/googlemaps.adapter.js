/**
 * GOD API — Google Maps Adapter
 *
 * transformRequest: injects API key as query param (Google's auth convention)
 * transformResponse: promotes results[], status, and first result location
 * handleError: maps Google Maps API status strings to GOD codes
 */
const BaseProvider = require('./BaseProvider');

class GoogleMapsAdapter extends BaseProvider {
    constructor() {
        super('https://maps.googleapis.com', {
            'Content-Type': 'application/json',
        });

        this.name        = 'google-maps';
        this.displayName = 'Google Maps';
        this.description = 'Geocoding, directions, places, distance matrix via Google Maps Platform.';
        this.baseUrl     = 'https://maps.googleapis.com';
        this.docsUrl     = 'https://developers.google.com/maps/documentation';
        this.version     = 'v1';
    }

    transformRequest({ method, path, body, query, headers }) {
        // Google Maps authenticates via API key as a query parameter
        return {
            method,
            path,
            body,
            query: {
                ...query,
                key: process.env.GOOGLE_MAPS_API_KEY,
            },
            headers,
        };
    }

    transformResponse(providerResponse, meta) {
        const data   = providerResponse.data;
        const status = data?.status; // Google's own status field, e.g. "OK", "ZERO_RESULTS"

        // Promote the most useful parts based on response shape
        const promoted = {};

        // Geocoding response
        if (data?.results?.length > 0) {
            const first = data.results[0];
            promoted.count    = data.results.length;
            promoted.address  = first?.formatted_address;
            promoted.location = first?.geometry?.location;  // { lat, lng }
            promoted.placeId  = first?.place_id;
        }

        // Directions response
        if (data?.routes?.length > 0) {
            const leg = data.routes[0]?.legs?.[0];
            promoted.distance = leg?.distance;   // { text: "2.5 km", value: 2500 }
            promoted.duration = leg?.duration;   // { text: "5 mins", value: 300 }
            promoted.startAddress = leg?.start_address;
            promoted.endAddress   = leg?.end_address;
        }

        // Distance matrix
        if (data?.rows?.length > 0) {
            promoted.elements = data.rows[0]?.elements;
        }

        return {
            status: providerResponse.status,
            body: {
                googleStatus: status,       // "OK" | "ZERO_RESULTS" | "REQUEST_DENIED" etc.
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

            // Google Maps also returns errors inside 200 responses via `status` field
            const googleStatus = data?.status;
            const CODE_MAP = {
                'REQUEST_DENIED':        'INVALID_PROVIDER_CREDENTIALS',
                'OVER_DAILY_LIMIT':      'PROVIDER_QUOTA_EXCEEDED',
                'OVER_QUERY_LIMIT':      'PROVIDER_RATE_LIMITED',
                'INVALID_REQUEST':       'PROVIDER_INVALID_REQUEST',
                'ZERO_RESULTS':          'PROVIDER_NO_RESULTS',
                'NOT_FOUND':             'PROVIDER_RESOURCE_NOT_FOUND',
            };

            return {
                status:       err.response.status,
                message:      data?.error_message || googleStatus || `Google Maps returned HTTP ${err.response.status}`,
                code:         CODE_MAP[googleStatus] || 'PROVIDER_ERROR',
                googleStatus: googleStatus || null,
                upstream:     data,
            };
        }

        return super.handleError(err);
    }

    listTools() {
        return [
            { name: 'geocode', description: 'Convert address → lat/lng (first result promoted to root)', endpoint: 'GET /v1/google-maps/maps/api/geocode/json', inputSchema: { type: 'object', properties: { address: { type: 'string' }, latlng: { type: 'string' } } }, rateLimit: '50/sec', authRequired: true },
            { name: 'directions', description: 'Get turn-by-turn directions (distance/duration promoted to root)', endpoint: 'GET /v1/google-maps/maps/api/directions/json', inputSchema: { type: 'object', required: ['origin', 'destination'], properties: { origin: { type: 'string' }, destination: { type: 'string' }, mode: { type: 'string', enum: ['driving', 'walking', 'bicycling', 'transit'], default: 'driving' } } }, rateLimit: '50/sec', authRequired: true },
            { name: 'place_search', description: 'Search places by text', endpoint: 'GET /v1/google-maps/maps/api/place/textsearch/json', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, radius: { type: 'integer' } } }, rateLimit: '50/sec', authRequired: true },
            { name: 'distance_matrix', description: 'Calculate distances between multiple points', endpoint: 'GET /v1/google-maps/maps/api/distancematrix/json', inputSchema: { type: 'object', required: ['origins', 'destinations'], properties: { origins: { type: 'string' }, destinations: { type: 'string' }, mode: { type: 'string', default: 'driving' } } }, rateLimit: '50/sec', authRequired: true },
        ];
    }
}

module.exports = GoogleMapsAdapter;
