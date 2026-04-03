/**
 * GOD API — Analytics Service (v2)
 *
 * Changes from v1:
 *  - logRequest() now accepts and stores the new UsageLog v2 fields:
 *    requestId, ipHash, userAgent, bytesIn, bytesOut, keyVersion, rateLimited
 *  - scrubErrorMessage() sanitizes error messages before DB storage using
 *    the shared sensitive-data scrubber from requestLogger middleware
 *  - getTenantUsage() enhanced with: error rate %, avg response time,
 *    hourly breakdown for the last 24h, and p95 response time
 *  - Added getPlatformStats() for admin-level analytics across all tenants
 */
const UsageLog = require('../models/UsageLog');
const { scrubSensitiveData } = require('../middleware/requestLogger');

class AnalyticsService {
    /**
     * Sanitize an error message before writing to the database.
     * Strips API keys, tokens, and other secrets that might appear in
     * upstream provider error messages.
     *
     * @param {string|null} message
     * @returns {string|null}
     */
    static scrubErrorMessage(message) {
        if (!message) return null;
        // Truncate to schema max, then scrub patterns
        const truncated = String(message).slice(0, 500);
        return scrubSensitiveData(truncated);
    }

    /**
     * Log a gateway request. Fire-and-forget — never blocks the response.
     */
    static logRequest({
        tenantId,
        tenantName,
        provider,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        success,
        errorMessage = null,
        idempotencyKey = null,
        // New v2 fields (all optional — backwards compatible)
        requestId = null,
        ipHash = null,
        userAgent = null,
        tokensUsed = { prompt: 0, completion: 0, total: 0 },
        bytesIn = 0,
        bytesOut = 0,
        keyVersion = null,
        rateLimited = false,
    }) {
        UsageLog.create({
            tenantId,
            tenantName,
            provider,
            endpoint,
            method,
            statusCode,
            responseTimeMs,
            success,
            errorMessage: AnalyticsService.scrubErrorMessage(errorMessage),
            idempotencyKey,
            requestId,
            ipHash,
            userAgent: userAgent ? String(userAgent).slice(0, 200) : null,
            tokensUsed,
            bytesIn,
            bytesOut,
            keyVersion,
            rateLimited,
        }).catch((err) => {
            console.error('[Analytics] Failed to write usage log:', err.message);
        });
    }

    /**
     * Get usage summary for a single tenant.
     *
     * Returns:
     *  - Total requests in window
     *  - Error rate percentage
     *  - Breakdown by provider (requests, errors, avg + p95 response time)
     *  - Hourly request counts for the last 24 hours
     *  - Last 10 requests
     *
     * @param {string|ObjectId} tenantId
     * @param {number} [days=7]
     */
    static async getTenantUsage(tenantId, days = 7) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [total, errorCount, totals, byProvider, dailyUsage, hourly, recent] = await Promise.all([

            // ── Total requests ───────────────────────────────────────────────
            UsageLog.countDocuments({ tenantId, createdAt: { $gte: since } }),

            // ── Error count ──────────────────────────────────────────────────
            UsageLog.countDocuments({ tenantId, success: false, createdAt: { $gte: since } }),

            // ── Aggregated Totals (Tokens, Bytes) ─────────────────────────────
            UsageLog.aggregate([
                { $match: { tenantId, createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: null,
                        totalTokens: { $sum: '$tokensUsed.total' },
                        totalBytesOut: { $sum: '$bytesOut' }
                    }
                }
            ]),

            // ── Per-provider breakdown ───────────────────────────────────────
            UsageLog.aggregate([
                { $match: { tenantId, createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: '$provider',
                        requests:      { $sum: 1 },
                        errors:        { $sum: { $cond: ['$success', 0, 1] } },
                        avgResponseMs: { $avg: '$responseTimeMs' },
                        totalTokens:   { $sum: '$tokensUsed.total' },
                        responseTimes: { $push: '$responseTimeMs' },
                    },
                },
                // Compute p95 response time from the collected array
                {
                    $addFields: {
                        p95ResponseMs: {
                            $let: {
                                vars: {
                                    sorted: { $sortArray: { input: '$responseTimes', sortBy: 1 } },
                                },
                                in: {
                                    $arrayElemAt: [
                                        '$$sorted',
                                        { $floor: { $multiply: [{ $size: '$$sorted' }, 0.95] } },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        provider:      '$_id',
                        requests:      1,
                        errors:        1,
                        errorRate:     {
                            $cond: [
                                { $eq: ['$requests', 0] }, 0,
                                { $round: [{ $multiply: [{ $divide: ['$errors', '$requests'] }, 100] }, 1] },
                            ],
                        },
                        avgResponseMs: { $round: ['$avgResponseMs', 0] },
                        p95ResponseMs: { $round: ['$p95ResponseMs', 0] },
                        totalTokens: 1,
                        _id:           0,
                    },
                },
                { $sort: { requests: -1 } },
            ]),

            // ── Daily Breakdown (for Dashboard Chart) ────────────────────────
            UsageLog.aggregate([
                { $match: { tenantId, createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        requests: { $sum: 1 },
                        tokens: { $sum: '$tokensUsed.total' }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        date: '$_id',
                        requests: 1,
                        tokens: 1,
                        _id: 0
                    }
                }
            ]),

            // ── Hourly breakdown — last 24 hours ─────────────────────────────
            UsageLog.aggregate([
                { $match: { tenantId, createdAt: { $gte: last24h } } },
                {
                    $group: {
                        _id: {
                            year:  { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day:   { $dayOfMonth: '$createdAt' },
                            hour:  { $hour: '$createdAt' },
                        },
                        requests: { $sum: 1 },
                        errors:   { $sum: { $cond: ['$success', 0, 1] } },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
                {
                    $project: {
                        _id:      0,
                        hour:     '$_id.hour',
                        day:      '$_id.day',
                        requests: 1,
                        errors:   1,
                    },
                },
            ]),

            // ── Recent requests ──────────────────────────────────────────────
            UsageLog.find({ tenantId })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('requestId provider endpoint method statusCode responseTimeMs success errorMessage createdAt'),
        ]);

        const errorRate = total > 0 ? Number(((errorCount / total) * 100).toFixed(1)) : 0;
        const totalTokens = totals[0]?.totalTokens || 0;

        return {
            period:        `Last ${days} days`,
            totalRequests: total,
            totalTokens,
            errorCount,
            errorRate:     `${errorRate}%`,
            byProvider,
            dailyUsage,
            hourly,
            recentRequests: recent,
        };
    }

    /**
     * Platform-wide stats across ALL tenants (admin use only).
     * Returns top providers by volume, top error-prone tenants, and overall health.
     *
     * @param {number} [hours=1]  Lookback window in hours
     */
    static async getPlatformStats(hours = 1) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const [overview, topProviders, topErrors] = await Promise.all([

            // ── Overall health in the window ─────────────────────────────────
            UsageLog.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id:           null,
                        totalRequests: { $sum: 1 },
                        totalErrors:   { $sum: { $cond: ['$success', 0, 1] } },
                        avgResponseMs: { $avg: '$responseTimeMs' },
                        totalBytesOut: { $sum: '$bytesOut' },
                    },
                },
                { $project: { _id: 0 } },
            ]),

            // ── Top providers by request volume ──────────────────────────────
            UsageLog.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id:      '$provider',
                        requests: { $sum: 1 },
                        errors:   { $sum: { $cond: ['$success', 0, 1] } },
                    },
                },
                { $sort: { requests: -1 } },
                { $limit: 5 },
                { $project: { provider: '$_id', requests: 1, errors: 1, _id: 0 } },
            ]),

            // ── Tenants with most errors ─────────────────────────────────────
            UsageLog.aggregate([
                { $match: { success: false, createdAt: { $gte: since } } },
                {
                    $group: {
                        _id:    '$tenantId',
                        name:   { $first: '$tenantName' },
                        errors: { $sum: 1 },
                    },
                },
                { $sort: { errors: -1 } },
                { $limit: 5 },
                { $project: { tenantId: '$_id', name: 1, errors: 1, _id: 0 } },
            ]),
        ]);

        return {
            period:       `Last ${hours} hour(s)`,
            overview:     overview[0] || { totalRequests: 0, totalErrors: 0, avgResponseMs: 0 },
            topProviders,
            topErrors,
        };
    }
}

module.exports = AnalyticsService;
