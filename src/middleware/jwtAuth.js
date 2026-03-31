/**
 * GOD API — JWT Authentication Middleware
 */
const { errorResponse } = require('../utils/response');

// Lazy-loaded dependencies
let jwt = null;
let User = null;
let Tenant = null;

const authenticateJwt = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Authorization header required.', 401, 'MISSING_JWT');
        }

        const token = authHeader.slice(7).trim();

        // ── 1. Lazy load dependencies ─────────────────────────────────────
        if (!jwt) jwt = require('jsonwebtoken');
        if (!User) User = require('../models/User');
        if (!Tenant) Tenant = require('../models/Tenant');

        // ── 2. Verify JWT signature + expiry ──────────────────────────────
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return errorResponse(res, 'Session expired. Please login again.', 401, 'JWT_EXPIRED');
            }
            return errorResponse(res, 'Invalid token. Please login again.', 401, 'JWT_INVALID');
        }

        // ── 3. Load user + tenant ─────────────────────────────────────────
        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            return errorResponse(res, 'User no longer exists', 401, 'USER_NOT_FOUND');
        }

        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant || tenant.status === 'deleted') {
            return errorResponse(res, 'Tenant not found or deleted', 401, 'TENANT_NOT_FOUND');
        }

        // ── 4. Attach to request ──────────────────────────────────────────
        req.user = user;
        req.userTenant = tenant;
        next();

    } catch (error) {
        console.error('[JwtAuth] Unexpected error:', error.message);
        return errorResponse(res, 'Authentication error', 500, 'AUTH_ERROR');
    }
};

/**
 * Authorization middleware for role-based access.
 * Must be used AFTER authenticateJwt.
 */
const authorizeRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return errorResponse(res, `Access denied: ${role} role required`, 403, 'FORBIDDEN');
        }
        next();
    };
};

module.exports = { authenticateJwt, authorizeRole };
