/**
 * GOD API — Usage Log Model (v2)
 *
 * What's new vs v1:
 *  - requestId: UUID assigned at request entry — links this log to morgan/console output
 *  - ipHash:    SHA-256 of the client IP for GDPR-safe geo analysis (no raw IPs stored)
 *  - userAgent: sanitized client UA string
 *  - bytesIn / bytesOut: payload sizes for cost metering
 *  - keyVersion: which rotation version of the tenant's key was used
 *  - rateLimited: flag set when the request was rejected by rate limiter
 *  - Additional indexes for the new aggregation queries in analyticsService
 */
const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
    {
        // ── Tenant ──────────────────────────────────────────────────────────
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        tenantName: {
            type: String, // Denormalized — avoids JOIN for analytics queries
        },

        // ── Request Identity ────────────────────────────────────────────────
        /**
         * UUID v4 generated at request entry by requestLogger middleware.
         * Returned to client in X-Request-ID header for support tracing.
         */
        requestId: {
            type: String,
            index: true,
        },

        /**
         * SHA-256 of the raw IP address.
         * Lets you group/detect anomalies by source without storing PII.
         * Raw IP is never persisted.
         */
        ipHash: {
            type: String,
        },

        /**
         * Sanitized User-Agent string (first 200 chars, no auth tokens).
         */
        userAgent: {
            type: String,
            maxlength: 200,
        },

        // ── Routing ─────────────────────────────────────────────────────────
        provider: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },
        endpoint: {
            type: String,
            required: true,
        },
        method: {
            type: String,
            uppercase: true,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        },

        // ── Response ─────────────────────────────────────────────────────────
        statusCode: {
            type: Number,
            index: true, // useful for filtering errors
        },
        responseTimeMs: {
            type: Number,
        },
        success: {
            type: Boolean,
            index: true,
        },

        // ── Payload Sizes (bytes) ─────────────────────────────────────────────
        bytesIn: {
            type: Number,
            default: 0,
        },
        bytesOut: {
            type: Number,
            default: 0,
        },

        // ── Error Details ────────────────────────────────────────────────────
        /**
         * Short error message — MUST be scrubbed before storage.
         * See AnalyticsService.scrubErrorMessage() for the sanitizer.
         */
        errorMessage: {
            type: String,
            maxlength: 500,
            default: null,
        },

        // ── Meta ──────────────────────────────────────────────────────────────
        idempotencyKey: {
            type: String,
            default: null,
        },
        /**
         * Which rotation version of the API key was used.
         * Lets you see if tenants have updated to a rotated key.
         */
        keyVersion: {
            type: Number,
            default: null,
        },
        /**
         * True when this request hit a rate limit (logged before rejection).
         */
        rateLimited: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true, // createdAt drives the TTL index
    }
);

// ── TTL: auto-delete after 30 days ──────────────────────────────────────────
usageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ── Query indexes ─────────────────────────────────────────────────────────────
// Dashboard: tenant usage breakdown by provider over time
usageLogSchema.index({ tenantId: 1, provider: 1, createdAt: -1 });
// Error analysis: find all failures for a tenant
usageLogSchema.index({ tenantId: 1, success: 1, createdAt: -1 });
// Platform-wide provider health: errors per provider per time window
usageLogSchema.index({ provider: 1, success: 1, createdAt: -1 });

module.exports = mongoose.model('UsageLog', usageLogSchema);
