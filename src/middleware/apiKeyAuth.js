const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { hashApiKey } = require('../utils/cryptoUtils');

/**
 * GOD API — API Key Authentication Middleware
 *
 * Authenticates requests using the 'X-GOD-API-Key' header.
 * Lookup flow:
 *  1. Extract key from header
 *  2. Hash incoming key
 *  3. Find Tenant by exact hash matching (current or previous key slot)
 *  4. Validate status and metadata
 */
const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.header('X-GOD-API-Key');
        if (!apiKey) {
            return res.status(401).json({ success: false, error: 'API Key is missing' });
        }

        // Generate hash of incoming key
        const keyHash = hashApiKey(apiKey);

        // Find Tenant by unique hash in either slot
        const tenant = await Tenant.findOne({
            $or: [
                { 'currentKey.hash': keyHash },
                { 'previousKey.hash': keyHash }
            ]
        });

        if (!tenant || tenant.status === 'suspended') {
            return res.status(401).json({
                success: false,
                error: tenant?.status === 'suspended' ? 'Tenant account suspended' : 'Invalid API Key'
            });
        }

        // Validate the key slot details (expiry, etc)
        const validation = tenant.validateKeyHash(keyHash);

        if (!validation.valid) {
            return res.status(401).json({ success: false, error: validation.reason || 'Invalid API Key' });
        }

        // Attach tenant and user context to request
        const user = await User.findOne({ tenantId: tenant._id });

        req.user = user;
        req.tenant = tenant;
        req.authSlot = validation.slot;

        next();
    } catch (e) {
        console.error('[ApiKeyAuth] Error:', e.message);
        res.status(401).json({ success: false, error: 'Authentication failed' });
    }
};

module.exports = apiKeyAuth;
