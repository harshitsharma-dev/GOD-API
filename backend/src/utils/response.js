/**
 * GOD API — Standardized Response Helpers
 *
 * Used across controllers to ensure consistent JSON structure.
 */

const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const errorResponse = (res, message = 'Something went wrong', statusCode = 500, code = 'SERVER_ERROR') => {
    return res.status(statusCode).json({
        success: false,
        error: message,
        code,
    });
};

module.exports = { successResponse, errorResponse };
