/**
 * GOD API — Authentication Middleware (v2)
 *
 * Changes from v1:
 *  - Validates against BOTH currentKey and previousKey (rotation grace period)
 *  - Checks key expiration (rejects expired keys)
 *  - Updates lastUsedAt on the matching key slot (fire-and-forget)
 *  - Warns in response header when the current key is expiring soon
 */
const Tenant = require('../models/Tenant');
const { hashApiKey } = require('../utils/cryptoUtils');
const { errorResponse } = require('../utils/response');

const authenticateApiKey = async (req, res, next) => {
    try {
        // ── 1. Parse Authorization header ─────────────────────────────────
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return errorResponse(res, 'Authorization header is required. Use: Authorization: Bearer god_live_xxx', 401, 'MISSING_AUTH_HEADER');
        }

        if (!authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Invalid Authorization format. Use: Bearer <your-god-api-key>', 401, 'INVALID_AUTH_FORMAT');
        }

        const apiKey = authHeader.slice(7).trim();

        if (!apiKey || apiKey.length < 10) {
            return errorResponse(res, 'API key is malformed', 401, 'MALFORMED_API_KEY');
        }

        if (!apiKey.startsWith('god_')) {
            return errorResponse(res, 'Invalid API key format. GOD API keys start with "god_live_", "god_test_", or "god_dev_"', 401, 'INVALID_KEY_FORMAT');
        }

        // ── 2. Hash the incoming key ───────────────────────────────────────
        const hashedKey = hashApiKey(apiKey);

        // ── 3. Find a tenant whose currentKey OR previousKey matches ───────
        // Single DB query — checks both slots at once using $or
        const tenant = await Tenant.findOne({
            $or: [
                { 'currentKey.hash': hashedKey },
                { 'previousKey.hash': hashedKey },
            ],
        });

        if (!tenant) {
            return errorResponse(res, 'Invalid API key', 401, 'INVALID_API_KEY');
        }

        // ── 4. Validate which slot matched + check expiry ──────────────────
        const { valid, slot, reason } = tenant.validateKeyHash(hashedKey);

        if (!valid) {
            if (reason === 'KEY_EXPIRED' || reason === 'PREVIOUS_KEY_EXPIRED') {
                return errorResponse(res, 'Your API key has expired. Please rotate your key via POST /admin/tenants/:id/rotate-key', 401, reason);
            }
            return errorResponse(res, 'Invalid API key', 401, 'INVALID_API_KEY');
        }

        // ── 5. Validate tenant account status ─────────────────────────────
        if (tenant.status === 'suspended') {
            return errorResponse(res, 'Your account is suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED');
        }

        if (tenant.status === 'deleted') {
            return errorResponse(res, 'Invalid API key', 401, 'INVALID_API_KEY');
        }

        // ── 6. Warn if using old key during grace period ───────────────────
        if (slot === 'previous') {
            const expiresIn = tenant.previousKey.expiresAt
                ? Math.ceil((tenant.previousKey.expiresAt - Date.now()) / 1000 / 60)
                : null;

            res.setHeader('X-GOD-Warning', 'You are using a rotated key. It will expire soon. Update to your new key immediately.');
            if (expiresIn !== null) {
                res.setHeader('X-GOD-Key-Grace-Remaining-Minutes', String(expiresIn));
            }
        }

        // ── 7. Warn if current key is expiring soon ────────────────────────
        if (slot === 'current' && tenant.isKeyExpiringSoon(7)) {
            const expiresAt = tenant.currentKey.expiresAt?.toISOString();
            res.setHeader('X-GOD-Warning', `Your API key expires on ${expiresAt}. Rotate it soon.`);
        }

        // ── 8. Update lastUsedAt for the matched slot (fire-and-forget) ───
        const updateField = slot === 'current' ? 'currentKey.lastUsedAt' : 'previousKey.lastUsedAt';
        Tenant.findByIdAndUpdate(tenant._id, { [updateField]: new Date() })
              .catch(err => console.error('[Auth] Failed to update lastUsedAt:', err.message));

        // ── 9. Attach tenant to request ────────────────────────────────────
        req.tenant = tenant;
        next();

    } catch (error) {
        console.error('[Auth] Unexpected error:', error.message);
        return errorResponse(res, 'Authentication service error', 500, 'AUTH_ERROR');
    }
};

module.exports = { authenticateApiKey };
