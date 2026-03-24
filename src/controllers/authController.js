/**
 * GOD API — Auth Controller
 *
 * Handles user signup, login, and profile retrieval.
 * On signup: creates User + Tenant + GOD API key atomically.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { generateApiKey, hashApiKey } = require('../utils/cryptoUtils');
const { successResponse, errorResponse } = require('../utils/response');

// ── Helpers ──────────────────────────────────────────────────────────────────

const signJwt = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /auth/signup
 * Creates a new user with an auto-provisioned tenant + GOD API key.
 */
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return errorResponse(res, 'name, email, and password are required', 400, 'VALIDATION_ERROR');
        }
        if (password.length < 8) {
            return errorResponse(res, 'Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
        }

        // Check for existing user
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return errorResponse(res, 'Email already registered', 409, 'EMAIL_EXISTS');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate GOD API key
        const { fullKey, prefix } = generateApiKey('live');
        const keyHash = hashApiKey(fullKey);

        // Create Tenant (auto-provisioned)
        const tenant = await Tenant.create({
            name,
            email: email.toLowerCase().trim(),
            currentKey: {
                hash: keyHash,
                prefix,
                issuedAt: new Date(),
            },
            plan: 'free',
            status: 'active',
        });

        // Create User
        const user = await User.create({
            name,
            email: email.toLowerCase().trim(),
            passwordHash,
            tenantId: tenant._id,
        });

        // Sign JWT
        const token = signJwt(user._id);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                },
                // Show the plaintext key ONCE — never stored, never shown again
                apiKey: fullKey,
                apiKeyPrefix: prefix,
                warning: 'Save your GOD API key now — it will not be shown again!',
            },
        });

    } catch (error) {
        console.error('[Auth] Signup error:', error.message);
        return errorResponse(res, 'Signup failed. Please try again.', 500, 'SIGNUP_ERROR');
    }
};

/**
 * POST /auth/login
 * Returns a JWT for valid credentials.
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'email and password are required', 400, 'VALIDATION_ERROR');
        }

        // Fetch user with password hash (hidden by default with select: false)
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
        if (!user) {
            return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        const passwordOk = await user.comparePassword(password);
        if (!passwordOk) {
            return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant || tenant.status === 'suspended') {
            return errorResponse(res, 'Account suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED');
        }

        const token = signJwt(user._id);

        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        });

    } catch (error) {
        console.error('[Auth] Login error:', error.message);
        return errorResponse(res, 'Login failed. Please try again.', 500, 'LOGIN_ERROR');
    }
};

/**
 * GET /auth/me
 * Returns the current authenticated user's profile.
 */
const me = async (req, res) => {
    try {
        const { user, userTenant } = req;

        return res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt,
                },
                tenant: {
                    id: userTenant._id,
                    plan: userTenant.plan,
                    status: userTenant.status,
                    apiKeyPrefix: userTenant.currentKey?.prefix,
                    keyVersion: userTenant.keyVersion,
                },
            },
        });
    } catch (error) {
        console.error('[Auth] Me error:', error.message);
        return errorResponse(res, 'Failed to fetch profile', 500, 'PROFILE_ERROR');
    }
};

module.exports = { signup, login, me };
