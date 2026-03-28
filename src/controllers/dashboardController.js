/**
 * GOD API — Dashboard Controller
 *
 * Provides user dashboard data and API key rotation for UI users (JWT auth).
 * Key rotation reuses the existing Tenant model's key rotation logic.
 */
const Tenant = require('../models/Tenant');
const UsageLog = require('../models/UsageLog');
const { generateApiKey, hashApiKey } = require('../utils/cryptoUtils');
const { errorResponse } = require('../utils/response');
const ProviderFactory = require('../providers/ProviderFactory');

const getDashboard = async (req, res) => {
    try {
        const { user, userTenant: tenant } = req;

        // ── Usage Stats (last 7 days — matches dashboard requirements) ────
        const AnalyticsService = require('../services/analyticsService');
        const usageData = await AnalyticsService.getTenantUsage(tenant._id, 7);

        // ── Providers list ────────────────────────────────────────────────
        const providers = ProviderFactory.listProviders().map(p => ({
            name: p.name,
            description: p.description || null,
        }));

        return res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    memberSince: user.createdAt,
                },
                tenant: {
                    id: tenant._id,
                    name: tenant.name,
                    plan: tenant.plan,
                    status: tenant.status,
                    keyVersion: tenant.keyVersion,
                    rateLimitPerMin: tenant.rateLimitPerMin || 60,
                    allowedProviders: tenant.allowedProviders.length
                        ? tenant.allowedProviders
                        : providers.map(p => p.name),
                },
                apiKey: {
                    prefix: tenant.currentKey?.prefix,
                    issuedAt: tenant.currentKey?.issuedAt,
                    lastUsedAt: tenant.currentKey?.lastUsedAt,
                    expiresAt: tenant.currentKey?.expiresAt || null,
                },
                usage: usageData,
                providers,
            },
        });

    } catch (error) {
        console.error('[Dashboard] Error:', error.stack);
        return errorResponse(res, 'Failed to load dashboard', 500, 'DASHBOARD_ERROR');
    }
};

/**
 * POST /keys/rotate
 * Rotates the tenant's GOD API key.
 * Old key remains valid for 24 hours (grace period).
 * New plaintext key returned ONCE — never stored.
 */
const rotateKey = async (req, res) => {
    try {
        const tenant = req.userTenant;

        // Generate new key
        const { fullKey, prefix } = generateApiKey('live');
        const newKeyHash = hashApiKey(fullKey);

        // Grace period: old key valid for 24 h
        const gracePeriodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Move current → previous, set new current
        await Tenant.findByIdAndUpdate(tenant._id, {
            previousKey: {
                hash: tenant.currentKey.hash,
                prefix: tenant.currentKey.prefix,
                issuedAt: tenant.currentKey.issuedAt,
                expiresAt: gracePeriodEnd,
            },
            currentKey: {
                hash: newKeyHash,
                prefix,
                issuedAt: new Date(),
                expiresAt: null,
            },
            $inc: { keyVersion: 1 },
        });

        return res.json({
            success: true,
            message: 'API key rotated successfully',
            data: {
                newApiKey: fullKey,
                newPrefix: prefix,
                previousKeyExpiresAt: gracePeriodEnd.toISOString(),
                warning: 'Save your new GOD API key now — it will not be shown again! Your old key works for 24 hours.',
            },
        });

    } catch (error) {
        console.error('[Dashboard] Rotate key error:', error.message);
        return errorResponse(res, 'Failed to rotate key', 500, 'ROTATE_ERROR');
    }
};

module.exports = { getDashboard, rotateKey };
