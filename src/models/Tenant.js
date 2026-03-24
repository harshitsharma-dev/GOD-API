/**
 * GOD API — Tenant Model (v2)
 *
 * Upgrades from v1:
 *  - Key expiration support (expiresAt field)
 *  - Key rotation: stores a second "previous" key hash with its own grace period
 *  - lastUsedAt: updated on every successful auth for audit purposes
 *  - keyVersion: incremented on each rotation so you can tell keys apart
 */
const mongoose = require('mongoose');

// ── Reusable sub-schema for an API key slot ────────────────────────────────
const keySlotSchema = new mongoose.Schema(
    {
        /**
         * SHA-256 hash of the plaintext key.
         * Plaintext is NEVER stored — only the hash.
         */
        hash: {
            type: String,
            required: true,
        },

        /**
         * First ~20 chars of the plaintext key, safe to display in dashboards.
         * e.g. "god_live_a8Kx9mPqR2..."
         */
        prefix: {
            type: String,
            required: true,
        },

        /** When this key was issued */
        issuedAt: {
            type: Date,
            default: Date.now,
        },

        /**
         * Hard expiry — null means "never expires".
         * After this timestamp the key is rejected even if the hash matches.
         */
        expiresAt: {
            type: Date,
            default: null,
        },

        /** Last time this specific key slot was used successfully */
        lastUsedAt: {
            type: Date,
            default: null,
        },
    },
    { _id: false } // Embedded, no separate _id needed
);

const tenantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tenant name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name must be at most 100 characters'],
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
        },

        /**
         * ACTIVE key slot.
         * This is the current, valid API key.
         */
        currentKey: {
            type: keySlotSchema,
            required: true,
        },

        /**
         * PREVIOUS key slot — populated during key rotation.
         *
         * After rotation the old key continues to work until `previousKey.expiresAt`
         * (default: 24 hours after rotation). After that it is cleared.
         *
         * This gives tenants time to update their integrations without downtime.
         */
        previousKey: {
            type: keySlotSchema,
            default: null,
        },

        /**
         * Monotonically increasing counter — incremented on every rotation.
         * Lets you know how many times the key has been rotated.
         */
        keyVersion: {
            type: Number,
            default: 1,
        },

        // ────────────────────────────────────────────────────────────────────

        /**
         * Providers the tenant is allowed to access.
         * Empty array = access to ALL registered providers.
         */
        allowedProviders: {
            type: [String],
            default: [],
        },

        /** Per-tenant rate limit override (requests per minute). null = global default. */
        rateLimitPerMin: {
            type: Number,
            default: null,
        },

        status: {
            type: String,
            enum: ['active', 'suspended', 'deleted'],
            default: 'active',
        },

        plan: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free',
        },
    },
    { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Compound sparse index: fast lookup by current key hash + optional previous key hash
tenantSchema.index({ 'currentKey.hash': 1 }, { unique: true });
tenantSchema.index({ 'previousKey.hash': 1 }, { sparse: true }); // sparse = ignore null

// ── Instance Methods ───────────────────────────────────────────────────────

/**
 * Check if a tenant has access to a specific provider.
 */
tenantSchema.methods.canAccessProvider = function (providerName) {
    if (!this.allowedProviders || this.allowedProviders.length === 0) {
        return true;
    }
    return this.allowedProviders.includes(providerName.toLowerCase());
};

/**
 * Check whether a given hash matches EITHER the current or the previous key,
 * and whether the matching key slot is not expired.
 *
 * Returns: { valid: boolean, slot: 'current'|'previous'|null }
 */
tenantSchema.methods.validateKeyHash = function (hash) {
    const now = new Date();

    // ── Check current key ──────────────────────────────────────────────────
    if (this.currentKey && this.currentKey.hash === hash) {
        if (this.currentKey.expiresAt && this.currentKey.expiresAt < now) {
            return { valid: false, slot: null, reason: 'KEY_EXPIRED' };
        }
        return { valid: true, slot: 'current' };
    }

    // ── Check previous key (grace period during rotation) ─────────────────
    if (this.previousKey && this.previousKey.hash === hash) {
        if (this.previousKey.expiresAt && this.previousKey.expiresAt < now) {
            return { valid: false, slot: null, reason: 'PREVIOUS_KEY_EXPIRED' };
        }
        return { valid: true, slot: 'previous' };
    }

    return { valid: false, slot: null, reason: 'INVALID_API_KEY' };
};

/**
 * Check whether the CURRENT key is within N days of expiry.
 * Used to send expiry warnings.
 *
 * @param {number} withinDays
 * @returns {boolean}
 */
tenantSchema.methods.isKeyExpiringSoon = function (withinDays = 7) {
    if (!this.currentKey?.expiresAt) return false;
    const warnAt = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    return this.currentKey.expiresAt <= warnAt;
};

module.exports = mongoose.model('Tenant', tenantSchema);
