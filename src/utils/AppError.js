/**
 * GOD API — AppError
 *
 * Structured application error class. Throw this anywhere in the codebase
 * instead of plain Error objects. The global errorHandler recognises it
 * and formats it correctly without leaking internals.
 *
 * Usage:
 *   throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
 *   throw new AppError('Provider quota exceeded', 429, 'PROVIDER_QUOTA_EXCEEDED');
 *
 * isOperational = true  → expected business error (4xx, known 5xx)
 *                         → logged as a warning, stack hidden in prod
 * isOperational = false → programming bug / unexpected crash
 *                         → logged as error, reported to crash monitoring
 */
class AppError extends Error {
    /**
     * @param {string}  message        Human-readable description
     * @param {number}  status         HTTP status code (default 500)
     * @param {string}  code           Machine-readable error code (e.g. 'TENANT_NOT_FOUND')
     * @param {boolean} isOperational  true = expected error, false = programming bug
     * @param {Object}  [meta]         Extra fields to attach (provider, upstream, etc.)
     */
    constructor(message, status = 500, code = 'INTERNAL_ERROR', isOperational = true, meta = {}) {
        super(message);

        this.name          = 'AppError';
        this.status        = status;
        this.code          = code;
        this.isOperational = isOperational;

        // Attach any extra fields (provider, upstream, declineCode, etc.)
        Object.assign(this, meta);

        // Capture clean stack trace pointing to the throw site, not this constructor
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Factory helpers — keeps throw sites concise and consistent.
     */

    static badRequest(message, code = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }

    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    static notFound(resource = 'Resource', code = 'NOT_FOUND') {
        return new AppError(`${resource} not found`, 404, code);
    }

    static conflict(message, code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }

    static tooManyRequests(message = 'Rate limit exceeded', code = 'RATE_LIMIT_EXCEEDED') {
        return new AppError(message, 429, code);
    }

    static providerError(message, status, provider, code = 'PROVIDER_ERROR', upstream = undefined) {
        return new AppError(message, status, code, true, { provider, upstream });
    }

    static internal(message = 'Internal Server Error') {
        return new AppError(message, 500, 'INTERNAL_ERROR', false); // not operational!
    }
}

module.exports = AppError;
