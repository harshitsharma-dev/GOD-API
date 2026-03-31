/**
 * GOD API — Crypto Utility Functions
 *
 * Generates and hashes GOD API keys.
 * Plaintext keys are returned once and never stored.
 */
const crypto = require('crypto');

/**
 * Generate a GOD API key with a recognizable prefix.
 * Format: god_{env}_{random32hex}
 *
 * @param {'live'|'test'} env
 * @returns {{ fullKey: string, prefix: string }}
 */
const generateApiKey = (env = 'live') => {
    const random = crypto.randomBytes(24).toString('hex');
    const prefix = `god_${env}`;
    const fullKey = `${prefix}_${random}`;
    return { fullKey, prefix };
};

/**
 * One-way SHA-256 hash of the plaintext API key.
 * Stored in the database; plaintext is never persisted.
 *
 * @param {string} plainKey
 * @returns {string}
 */
const hashApiKey = (plainKey) => {
    return crypto.createHash('sha256').update(plainKey).digest('hex');
};

module.exports = { generateApiKey, hashApiKey };
