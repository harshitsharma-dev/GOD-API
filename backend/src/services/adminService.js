/**
 * GOD API — Admin Service (v2)
 *
 * Changes from v1:
 *  - createTenant writes to the new currentKey sub-document
 *  - Added rotateKey(): moves current → previous (with grace period), issues new current
 *  - listTenants projects out both key hashes
 *  - suspend/activate unchanged
 */
const Tenant = require('../models/Tenant');
const { generateApiKey, hashApiKey } = require('../utils/cryptoUtils');
const AppError = require('../utils/AppError');

class AdminService {
    /**
     * Create a new tenant and generate their first GOD API key.
     * The plaintext key is returned EXACTLY ONCE — it is not stored.
     *
     * @param {{ name, email?, plan?, expiresInDays? }} params
     */
    static async createTenant({ name, email, plan = 'free', expiresInDays = null }) {
        const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
        const { fullKey, prefix } = generateApiKey(env);
        const hash = hashApiKey(fullKey);

        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        const tenant = await Tenant.create({
            name: name.trim(),
            email: email ? email.trim().toLowerCase() : undefined,
            plan,
            currentKey: { hash, prefix, expiresAt },
            keyVersion: 1,
        });

        return {
            tenantId: tenant._id,
            name: tenant.name,
            email: tenant.email || null,
            plan: tenant.plan,
            keyVersion: tenant.keyVersion,
            keyPrefix: prefix,
            expiresAt: expiresAt?.toISOString() || null,
            apiKey: fullKey,  // ⚠️ SAVE THIS — shown only once
        };
    }

    /**
     * Rotate a tenant's API key.
     *
     * Flow:
     *  1. Generate a fresh key → becomes the new currentKey
     *  2. Move the old currentKey → previousKey (valid for `gracePeriodHours`)
     *  3. Increment keyVersion
     *
     * The old key stays valid during the grace period so the tenant can update
     * their integration without any downtime.
     *
     * @param {string} tenantId
     * @param {{ gracePeriodHours?: number, expiresInDays?: number|null }} opts
     */
    static async rotateKey(tenantId, { gracePeriodHours = 24, expiresInDays = null } = {}) {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            throw AppError.notFound('Tenant', 'TENANT_NOT_FOUND');
        }

        if (tenant.status !== 'active') {
            throw AppError.forbidden('Cannot rotate key for a suspended or deleted tenant', 'TENANT_NOT_ACTIVE');
        }

        const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';

        // ── 1. Generate the new key ────────────────────────────────────────
        const { fullKey: newPlainKey, prefix: newPrefix } = generateApiKey(env);
        const newHash = hashApiKey(newPlainKey);
        const newExpiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        // ── 2. Build the previous-key grace-period window ─────────────────
        const graceExpiresAt = gracePeriodHours > 0
            ? new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000)
            : new Date(); // expiresAt = now → immediately invalid

        // ── 3. Atomic update in DB ────────────────────────────────────────
        tenant.previousKey = {
            hash: tenant.currentKey.hash,
            prefix: tenant.currentKey.prefix,
            issuedAt: tenant.currentKey.issuedAt,
            expiresAt: graceExpiresAt,
            lastUsedAt: tenant.currentKey.lastUsedAt,
        };
        tenant.currentKey = {
            hash: newHash,
            prefix: newPrefix,
            issuedAt: new Date(),
            expiresAt: newExpiresAt,
            lastUsedAt: null,
        };
        tenant.keyVersion += 1;

        await tenant.save();

        return {
            tenantId: tenant._id,
            name: tenant.name,
            keyVersion: tenant.keyVersion,
            newKey: {
                apiKey: newPlainKey,  // ⚠️ SAVE THIS — shown only once
                prefix: newPrefix,
                expiresAt: newExpiresAt?.toISOString() || null,
            },
            previousKey: {
                prefix: tenant.previousKey.prefix,
                gracePeriodHours,
                expiresAt: graceExpiresAt.toISOString(),
            },
            message: gracePeriodHours > 0
                ? `Old key valid for ${gracePeriodHours} more hours. Update your integration to use the new key.`
                : 'Old key immediately revoked.',
        };
    }

    /**
     * List all tenants — never returns key hashes.
     */
    static async listTenants() {
        return Tenant.find(
            { status: { $ne: 'deleted' } },
            '-currentKey.hash -previousKey.hash' // Exclude hashes, keep prefixes
        ).sort({ createdAt: -1 });
    }

    static async suspendTenant(tenantId) {
        const tenant = await Tenant.findByIdAndUpdate(
            tenantId,
            { status: 'suspended' },
            { new: true }
        );
        if (!tenant) {
            throw AppError.notFound('Tenant', 'TENANT_NOT_FOUND');
        }
        return { tenantId: tenant._id, status: tenant.status };
    }

    static async activateTenant(tenantId) {
        const tenant = await Tenant.findByIdAndUpdate(
            tenantId,
            { status: 'active' },
            { new: true }
        );
        if (!tenant) {
            throw AppError.notFound('Tenant', 'TENANT_NOT_FOUND');
        }
        return { tenantId: tenant._id, status: tenant.status };
    }
}

module.exports = AdminService;
