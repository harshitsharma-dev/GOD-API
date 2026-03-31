const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { hashApiKey } = require('../utils/cryptoUtils');

/**
 * GOD API — API Key Authentication Middleware
 *
 * Authenticates requests using the 'X-GOD-API-Key' header.
 * Lookup flow:
 *  1. Extract key from header
 *  2. Split to get prefix (e.g., 'god_live')
 *  3. Find Tenant by prefix in currentKey or previousKey slots
 *  4. Hash incoming key and compare with stored hash
 *  5. Validate expiry/grace period
 */
const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.header('X-GOD-API-Key');
        if (!apiKey) {
            return res.status(401).json({ success: false, error: 'API Key is missing' });
        }

        // 1. Extract prefix (e.g., "god_live" from "god_live_xyz...")
        const parts = apiKey.split('_');
        if (parts.length < 3) {
            return res.status(401).json({ success: false, error: 'Invalid API Key format' });
        }
        const prefix = parts.slice(0, 2).join('_');

        // 2. Find Tenant by prefix in either slot
        const tenant = await Tenant.findOne({
            $or: [
                { 'currentKey.prefix': prefix },
                { 'previousKey.prefix': prefix }
            ]
        });

        if (!tenant || tenant.status === 'suspended') {
            return res.status(401).json({
                success: false,
                error: tenant?.status === 'suspended' ? 'Tenant account suspended' : 'Invalid API Key'
            });
        }

        // 3. Hash incoming key and validate
        const keyHash = hashApiKey(apiKey);
        const validation = tenant.validateKeyHash(keyHash);

        if (!validation.valid) {
            return res.status(401).json({ success: false, error: validation.reason || 'Invalid API Key' });
        }

        // 4. Load the primary user for this tenant to attach to req.user (legacy support)
        const user = await User.findOne({ tenantId: tenant._id });

        req.user = user;
        req.tenant = tenant;
        req.authSlot = validation.slot; // 'current' or 'previous'

        next();
    } catch (e) {
        console.error('[ApiKeyAuth] Error:', e.message);
        res.status(401).json({ success: false, error: 'Authentication failed' });
    }
};

module.exports = apiKeyAuth;
