/**
 * GOD API — JWT Authentication Middleware
 *
 * Protects user-facing routes (dashboard, key management).
 * Completely separate from the existing API key auth middleware.
 * Does NOT interfere with /v1/* routes.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { errorResponse } = require('../utils/response');

const authenticateJwt = async (req, res, next) => {
    try {
        // ── 1. Parse Authorization header ─────────────────────────────────
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Authorization header required. Use: Bearer <jwt_token>', 401, 'MISSING_JWT');
        }

        const token = authHeader.slice(7).trim();

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

module.exports = { authenticateJwt };
