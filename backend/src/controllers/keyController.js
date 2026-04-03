const { generateApiKey, hashApiKey } = require('../utils/cryptoUtils');
const Tenant = require('../models/Tenant');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GOD API — Legacy Key Controller
 * Refactored to manage keys at the Tenant level for multi-tenancy support.
 */

exports.generateKey = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return errorResponse(res, 'Tenant context missing', 400, 'TENANT_NOT_FOUND');
        }

        const { fullKey, prefix } = generateApiKey('live');
        const hash = hashApiKey(fullKey);

        // Atomic update: move current to previous, set new current
        await Tenant.findByIdAndUpdate(tenant._id, {
            previousKey: tenant.currentKey ? {
                hash: tenant.currentKey.hash,
                prefix: tenant.currentKey.prefix,
                issuedAt: tenant.currentKey.issuedAt,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h grace
            } : null,
            currentKey: { hash, prefix, issuedAt: new Date() },
            $inc: { keyVersion: 1 }
        });

        return successResponse(res, {
            apiKey: fullKey,
            prefix: prefix,
            warning: 'Store this key safely! It will not be shown again. Your old key (if any) works for 24 hours.'
        }, 'API Key generated successfully');
    } catch (error) {
        console.error('[KeyController] Generate error:', error.message);
        return errorResponse(res, error.message, 400, 'KEY_GEN_ERROR');
    }
};

exports.viewKeyStatus = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) return errorResponse(res, 'Tenant context missing', 400);

        return successResponse(res, {
            hasKey: !!tenant.currentKey,
            prefix: tenant.currentKey?.prefix || null,
            keyVersion: tenant.keyVersion,
            expiresAt: tenant.currentKey?.expiresAt || null
        });
    } catch (error) {
        return errorResponse(res, error.message, 400);
    }
};
