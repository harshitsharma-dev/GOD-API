/**
 * GOD API — Request Logger Middleware
 *
 * Runs on EVERY request (mounted in app.js before routes).
 * Responsibilities:
 *
 *  1. Assigns a UUID requestId to each request
 *     → Sent back in X-Request-ID header for client-side tracing
 *     → Stored in req.requestId for the gateway controller to pass to analytics
 *
 *  2. Records start time in req.startTime
 *     → Used by the gateway controller to calculate responseTimeMs
 *
 *  3. Hashes the client IP with SHA-256
 *     → Stored in req.ipHash — used in analytics without storing raw PII
 *
 *  4. Captures content-length for bytesIn
 *
 *  5. Intercepts res.end() to capture bytesOut (actual response bytes)
 *
 * WHAT IS NEVER LOGGED OR STORED:
 *  - Authorization header values (raw API keys / Bearer tokens)
 *  - Request body contents (may contain user secrets, PII, card data)
 *  - Raw IP addresses
 *  - Cookie / session values
 */
const crypto = require('crypto');

/**
 * Generates a UUID-like unique request ID without external dependencies.
 * Uses crypto.randomBytes for entropy.
 */
const generateRequestId = () => {
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = bytes.toString('hex');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join('-');
};

/**
 * SHA-256 hash of raw IP for GDPR-safe storage.
 * One-way: analytics can count unique "sources" without exposing PII.
 */
const hashIp = (ip) => {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip).digest('hex');
};

/**
 * Strip any auth-looking fragments from a string.
 * Catches leaked bearer tokens in error messages or UA strings.
 *
 * Patterns scrubbed:
 *   - "god_live_..." / "god_test_..." keys
 *   - "Bearer ..." prefixes
 *   - "sk-..." OpenAI keys
 *   - "sk_live_..." / "sk_test_..." Stripe keys
 */
const SENSITIVE_PATTERNS = [
    /god_(live|test|dev)_[A-Za-z0-9]{10,}/g,
    /Bearer\s+\S+/gi,
    /sk-[A-Za-z0-9]{10,}/g,
    /sk_(live|test)_[A-Za-z0-9]{10,}/g,
    /ghp_[A-Za-z0-9]{10,}/g,         // GitHub PATs
    /AC[a-z0-9]{32}/g,                // Twilio SID
    /AIza[0-9A-Za-z\-_]{35}/g,        // Google API keys
];

const scrubSensitiveData = (str) => {
    if (!str || typeof str !== 'string') return str;
    let result = str;
    for (const pattern of SENSITIVE_PATTERNS) {
        result = result.replace(pattern, '[REDACTED]');
    }
    return result;
};

// ── Main Middleware ────────────────────────────────────────────────────────
const requestLogger = (req, res, next) => {
    // ── 1. Request ID ────────────────────────────────────────────────────
    req.requestId = generateRequestId();
    req.startTime = Date.now();

    // Return the request ID to the client for support/debug tracing
    res.setHeader('X-Request-ID', req.requestId);

    // ── 2. IP Hash (GDPR-safe) ────────────────────────────────────────────
    const rawIp = req.ip || req.connection?.remoteAddress || '';
    req.ipHash = hashIp(rawIp);

    // ── 3. Bytes In ───────────────────────────────────────────────────────
    req.bytesIn = parseInt(req.headers['content-length'] || '0', 10) || 0;

    // ── 4. Intercept res.end to capture bytes out ─────────────────────────
    const originalEnd = res.end.bind(res);
    req.bytesOut = 0;

    res.end = function (chunk, encoding, callback) {
        if (chunk) {
            req.bytesOut = Buffer.isBuffer(chunk)
                ? chunk.length
                : Buffer.byteLength(chunk, encoding || 'utf8');
        }
        return originalEnd(chunk, encoding, callback);
    };

    next();
};

module.exports = { requestLogger, scrubSensitiveData, generateRequestId, hashIp };
