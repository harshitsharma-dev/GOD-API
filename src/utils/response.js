/**
 * GOD API — Response Utilities (v2)
 *
 * Changes from v1:
 *  - successResponse: includes requestId (from req.requestId) and timestamp
 *  - errorResponse:   includes requestId, timestamp, and details field
 *  - Both strip undefined fields so the envelope stays lean
 */

/**
 * Send a success response.
 *
 * @param {import('express').Response} res
 * @param {import('express').Request}  req   — used to read requestId
 * @param {any}    data
 * @param {string} message
 * @param {number} statusCode
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    // req is available via res.req in Express — no need to change all call sites
    const requestId = res.req?.requestId || undefined;

    return res.status(statusCode).json({
        success:   true,
        message,
        data,
        requestId,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {string|Error} error
 * @param {number}       statusCode
 * @param {string}       [code]
 * @param {Array}        [details]    Field-level validation errors
 */
const errorResponse = (res, error, statusCode = 500, code = null, details = null) => {
    const requestId = res.req?.requestId || undefined;
    const message   = error instanceof Error ? error.message : error;

    const body = {
        success:   false,
        error:     message || 'An unexpected error occurred',
        code:      code    || undefined,
        requestId,
        timestamp: new Date().toISOString(),
        details:   details || undefined,
    };

    // Remove undefined keys so the response stays clean
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };
