/**
 * GOD API — Global Error Handler Middleware (v2)
 *
 * Must be registered LAST in app.js (after all routes).
 * Catches every error forwarded via next(err).
 *
 * Error taxonomy handled:
 *
 *   OPERATIONAL ERRORS (expected — safe to return details to client):
 *     AppError             — Our own structured errors
 *     Mongoose ValidationError — Schema validation failures
 *     Mongoose CastError   — Invalid ObjectId (e.g. /tenants/not-an-id)
 *     Mongoose duplicate key (11000) — Unique constraint violation
 *     express JSON parse   — Malformed request body
 *     Zod ValidationError  — (from validate middleware, already handled — but safety net)
 *     Provider errors      — Errors thrown from adapter execute() pipeline
 *     Rate limit errors    — express-rate-limit 429 (has its own message, just re-formatted)
 *
 *   PROGRAMMING ERRORS (unexpected — hide details in production):
 *     Anything else        — Generic 500, stack logged server-side only
 *
 * Standard error envelope returned to every client:
 * {
 *   "success":   false,
 *   "error":     "Human readable message",
 *   "code":      "MACHINE_READABLE_CODE",
 *   "requestId": "uuid",         // always present for client-support correlation
 *   "details":   [...],          // only on validation errors
 *   "provider":  "openai",       // only on provider errors
 *   "upstream":  {...},          // only in non-production on provider errors
 *   "stack":     "...",          // only in development
 * }
 */
const AppError = require('../utils/AppError');

// ── Error normalizers ────────────────────────────────────────────────────────
// Each returns a plain { status, code, message, extra } that the renderer uses.

const normalizers = [

    // ── 1. Our own AppError ────────────────────────────────────────────────
    (err) => {
        if (err.name !== 'AppError') return null;
        return {
            status:  err.status,
            code:    err.code,
            message: err.message,
            extra:   {
                ...(err.provider  ? { provider: err.provider }   : {}),
                ...(err.upstream  ? { _upstream: err.upstream }  : {}),
                ...(err.declineCode ? { declineCode: err.declineCode } : {}),
            },
        };
    },

    // ── 2. Mongoose ValidationError ────────────────────────────────────────
    (err) => {
        if (err.name !== 'ValidationError') return null;
        const details = Object.values(err.errors).map((e) => ({
            field:   e.path,
            message: e.message,
        }));
        return {
            status:  400,
            code:    'VALIDATION_ERROR',
            message: 'Request validation failed',
            extra:   { details },
        };
    },

    // ── 3. Mongoose CastError (invalid ObjectId in URL params) ────────────
    (err) => {
        if (err.name !== 'CastError') return null;
        return {
            status:  400,
            code:    'INVALID_ID',
            message: `Invalid value for field '${err.path}': ${err.value}`,
        };
    },

    // ── 4. MongoDB duplicate key ───────────────────────────────────────────
    (err) => {
        if (err.code !== 11000) return null;
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return {
            status:  409,
            code:    'DUPLICATE_KEY',
            message: `A record with this ${field} already exists`,
        };
    },

    // ── 5. Express body-parser: malformed JSON ──────────────────────────
    (err) => {
        if (err.type !== 'entity.parse.failed') return null;
        return {
            status:  400,
            code:    'INVALID_JSON',
            message: 'Request body is not valid JSON',
        };
    },

    // ── 6. Provider adapter errors (thrown from adapter.execute()) ─────────
    // These are plain objects thrown with { status, message, code, provider }
    (err) => {
        if (!err.provider && err.code !== 'PROVIDER_ERROR' &&
            !err.code?.startsWith?.('PROVIDER_')) return null;
        return {
            status:  err.status || 502,
            code:    err.code   || 'PROVIDER_ERROR',
            message: err.message || 'An upstream provider error occurred',
            extra:   {
                provider: err.provider,
                ...(err.upstream ? { _upstream: err.upstream } : {}),
            },
        };
    },

    // ── 7. express-rate-limit 429 (has statusCode, not status) ────────────
    (err) => {
        if ((err.status || err.statusCode) !== 429) return null;
        return {
            status:  429,
            code:    'RATE_LIMIT_EXCEEDED',
            message: err.message || 'Too many requests. Please slow down.',
        };
    },

    // ── 8. Zod errors that slipped past validate middleware ────────────────
    (err) => {
        if (err.name !== 'ZodError') return null;
        const details = err.errors?.map(e => ({ field: e.path.join('.'), message: e.message }));
        return {
            status:  400,
            code:    'VALIDATION_ERROR',
            message: 'Validation failed',
            extra:   { details },
        };
    },
];

// ── Main handler ─────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const isProd      = process.env.NODE_ENV === 'production';
    const requestId   = req.requestId || null;

    // ── Run through normalizers to classify the error ─────────────────────
    let normalized = null;
    for (const normalizer of normalizers) {
        normalized = normalizer(err);
        if (normalized) break;
    }

    // ── Fallback: unknown / programming error ─────────────────────────────
    if (!normalized) {
        normalized = {
            status:  err.status || err.statusCode || 500,
            code:    'INTERNAL_ERROR',
            message: isProd ? 'An unexpected error occurred' : (err.message || 'Internal Server Error'),
        };
    }

    const { status, code, message, extra = {} } = normalized;

    // ── Server-side logging ────────────────────────────────────────────────
    const logLine = `[${status}] ${req.method} ${req.url} | code=${code} | rid=${requestId} | ${message}`;

    if (status >= 500) {
        console.error(logLine);
        if (!isProd) console.error(err.stack);
    } else {
        // 4xx are warnings only in development
        if (!isProd) console.warn(logLine);
    }

    // ── Build response payload ────────────────────────────────────────────
    const body = {
        success:   false,
        error:     message,
        code,
        requestId,           // Always present — lets clients quote this to support
        timestamp: new Date().toISOString(),
    };

    // Merge extra fields (details, provider, etc.)
    Object.assign(body, extra);

    // Strip upstream provider details in production
    if (isProd) delete body._upstream;

    // Stack trace in development only
    if (!isProd && err.stack) {
        body.stack = err.stack.split('\n').slice(0, 6).join('\n');
    }

    return res.status(status).json(body);
};

// ── Process-level safety net ─────────────────────────────────────────────────
// These don't go through Express — they're last-resort catches.
// In production, a process manager (PM2, Kubernetes) will restart the process.

process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Promise Rejection:', reason);
    // Give in-flight requests ~3s to complete, then exit
    // so the process manager can restart cleanly
    if (process.env.NODE_ENV === 'production') {
        setTimeout(() => process.exit(1), 3000);
    }
});

process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception — this is a programming error:', err);
    // Uncaught exceptions leave the process in an undefined state — always exit
    setTimeout(() => process.exit(1), 3000);
});

module.exports = { errorHandler };
