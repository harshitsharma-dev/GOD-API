/**
 * GOD API — Express Application (v2)
 *
 * Security upgrades:
 *  1. Helmet — tuned with Content-Security-Policy for an API (no browser UI)
 *  2. CORS  — restricted to CORS_ORIGIN env var; wildcard only in dev
 *  3. Morgan — custom format that NEVER logs Authorization headers or tokens
 *  4. Body size — kept at 10mb but easy to tune per env
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

// ── 0. Request ID + Timing (must be FIRST — before all other middleware) ────
app.use(requestLogger);

// ── 1. Security Headers (Helmet) ────────────────────────────────────────────
// Tuned for a pure JSON API — no HTML, no scripts, no cookies.
app.use(
    helmet({
        // Allow browsers / API clients to cache responses without downgrade
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        // Hide "X-Powered-By: Express"
        hidePoweredBy: true,
        // Prevent MIME sniffing
        noSniff: true,
        // Force HTTPS in production
        hsts: process.env.NODE_ENV === 'production'
            ? { maxAge: 31536000, includeSubDomains: true, preload: true }
            : false,
        // No iframes allowed
        frameguard: { action: 'deny' },
        // Disable XSS filter (deprecated, but set to be safe)
        xssFilter: true,
    })
);

// ── 2. CORS — whitelist only ────────────────────────────────────────────────
// In production set CORS_ORIGIN to your exact frontend domain(s).
// Multiple origins: "https://app.godapi.com,https://dashboard.godapi.com"
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : null; // null → allow all (dev only)

const corsOptions = {
    origin: (incomingOrigin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!incomingOrigin) return callback(null, true);

        // In production: strict whitelist
        if (allowedOrigins && !allowedOrigins.includes(incomingOrigin)) {
            return callback(
                new Error(`CORS: origin '${incomingOrigin}' is not allowed`),
                false
            );
        }
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-GOD-Idempotency-Key'],
    exposedHeaders: ['X-GOD-Warning', 'X-GOD-Key-Grace-Remaining-Minutes', 'RateLimit-Limit', 'RateLimit-Remaining'],
    credentials: false, // API keys don't use cookies
    maxAge: 600,        // Preflight cache: 10 minutes
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Explicit OPTIONS handler for all routes

// ── 3. Body Parsers ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 4. HTTP Request Logging — SENSITIVE DATA REDACTED ──────────────────────
// Custom morgan format that logs the essentials WITHOUT leaking:
//   - Authorization header values (API keys / Bearer tokens)
//   - Request bodies (may contain secrets)
//   - Cookie / session data
//
// Format: METHOD URL STATUS RESPONSE_TIME TENANT_ID (if authenticated)
morgan.token('tenant-id', (req) => {
    // req.tenant is set by auth middleware — log only the ID, never the key
    return req.tenant ? req.tenant._id.toString() : 'anonymous';
});

morgan.token('redacted-auth', (req) => {
    const auth = req.headers['authorization'];
    if (!auth) return '-';
    // Show only key type prefix, never the full value: "god_live_..." → "god_live_[REDACTED]"
    const match = auth.match(/^Bearer (god_[a-z]+_)/);
    return match ? `Bearer ${match[1]}[REDACTED]` : 'Bearer [REDACTED]';
});

const LOG_FORMAT = process.env.NODE_ENV === 'production'
    ? ':method :url :status :res[content-length] :response-time ms tenant=:tenant-id'
    : ':method :url :status :response-time ms tenant=:tenant-id auth=:redacted-auth';

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(LOG_FORMAT));
}

// ── 5. API Routes ────────────────────────────────────────────────────────────
app.use('/', routes);

// ── 6. Global Error Handler (must be last) ───────────────────────────────────
app.use(errorHandler);

module.exports = app;
