/**
 * GOD API — Application Error Class
 *
 * Custom error with statusCode and error code for consistent error handling.
 * Works with the global errorHandler middleware.
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'SERVER_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message, code = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }

    static unauthorized(message, code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    static forbidden(message, code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    static notFound(resource = 'Resource', code = 'NOT_FOUND') {
        return new AppError(`${resource} not found`, 404, code);
    }

    static conflict(message, code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }
}

module.exports = AppError;
