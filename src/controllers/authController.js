/**
 * GOD API — Auth Controller — Stable Version
 *
 * Uses cryptoFallback instead of bcryptjs to ensure environment stability.
 */
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { generateApiKey, hashApiKey } = require('../utils/cryptoUtils');
const { hashPassword } = require('../utils/cryptoFallback');
const { successResponse, errorResponse } = require('../utils/response');

const signJwt = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ── Handlers ─────────────────────────────────────────────────────────────────

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return errorResponse(res, 'name, email, and password are required', 400, 'VALIDATION_ERROR');
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return errorResponse(res, 'Email already registered', 409, 'EMAIL_EXISTS');
        }

        const passwordHash = await hashPassword(password);
        const { fullKey, prefix } = generateApiKey('live');
        const keyHash = hashApiKey(fullKey);

        const tenant = await Tenant.create({
            name,
            email: email.toLowerCase().trim(),
            currentKey: { hash: keyHash, prefix, issuedAt: new Date() },
            plan: 'free',
            status: 'active',
        });

        const user = await User.create({
            name,
            email: email.toLowerCase().trim(),
            passwordHash,
            tenantId: tenant._id,
        });

        const token = signJwt(user._id);

        return res.status(201).json({
            success: true,
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email },
                apiKey: fullKey,
                apiKeyPrefix: prefix,
            },
        });

    } catch (error) {
        console.error('[Auth] Signup error:', error.message);
        return errorResponse(res, 'Signup failed', 500, 'SIGNUP_ERROR');
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'email and password are required', 400, 'VALIDATION_ERROR');
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
        if (!user) {
            return errorResponse(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const passwordOk = await user.comparePassword(password);
        if (!passwordOk) {
            return errorResponse(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant || tenant.status === 'suspended') {
            return errorResponse(res, 'Account suspended', 403, 'ACCOUNT_SUSPENDED');
        }

        const token = signJwt(user._id);

        return res.json({
            success: true,
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email },
            },
        });

    } catch (error) {
        console.error('[Auth] Login error:', error.message);
        return errorResponse(res, 'Login failed', 500, 'LOGIN_ERROR');
    }
};

const me = async (req, res) => {
    try {
        const { user, userTenant } = req;
        return res.json({
            success: true,
            data: {
                user: { id: user._id, name: user.name, email: user.email },
                tenant: { id: userTenant._id, plan: userTenant.plan, status: userTenant.status },
            },
        });
    } catch (error) {
        console.error('[Auth] Me error:', error.message);
        return errorResponse(res, 'Failed to fetch profile', 500, 'PROFILE_ERROR');
    }
};

module.exports = { signup, login, me };
