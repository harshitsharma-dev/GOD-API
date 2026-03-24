/**
 * GOD API — Crypto Utilities
 *
 * Handles secure API key generation and hashing.
 * Design decisions:
 *  - Base62 encoding → URL-safe, no special chars, compact
 *  - SHA-256 for hashing → fast enough for per-request auth middleware
 *    (bcrypt is too slow at ~100ms; SHA-256 is <1ms)
 *  - 32 bytes = 256 bits of entropy → cryptographically secure
 */
const crypto = require('crypto');

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Encode a Buffer as a base62 string.
 * @param {Buffer} buffer
 * @returns {string}
 */
const toBase62 = (buffer) => {
    let num = BigInt('0x' + buffer.toString('hex'));
    let result = '';
    const base = BigInt(62);

    while (num > 0n) {
        result = BASE62_CHARS[Number(num % base)] + result;
        num = num / base;
    }

    // Pad to ensure consistent length (43 chars for 32-byte input)
    return result.padStart(43, '0');
};

/**
 * Generate a new GOD API key.
 *
 * Format: god_{env}_{base62_43chars}
 * Examples:
 *   god_live_a8Kx9mPqR2nL5vTw7yBcDf3gHj4kM6s0B9cPqT
 *   god_test_z1Yb4cNd7eFg0hIj3kLm6nOp9qRs2tUvW8xYaZ
 *
 * @param {'live'|'test'|'dev'} env
 * @returns {{ fullKey: string, prefix: string }}
 */
const generateApiKey = (env = 'live') => {
    const validEnvs = ['live', 'test', 'dev'];
    if (!validEnvs.includes(env)) {
        throw new Error(`Invalid environment: ${env}. Must be one of: ${validEnvs.join(', ')}`);
    }

    const randomBytes = crypto.randomBytes(32); // 256-bit entropy
    const encoded = toBase62(randomBytes);

    const fullKey = `god_${env}_${encoded}`;
    const prefix = `god_${env}_${encoded.substring(0, 6)}...`; // shown in dashboard

    return { fullKey, prefix };
};

/**
 * Hash an API key using SHA-256 for database storage.
 *
 * @param {string} apiKey  The plaintext API key
 * @returns {string}       Hex-encoded SHA-256 hash
 */
const hashApiKey = (apiKey) => {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('API key must be a non-empty string');
    }
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

module.exports = { generateApiKey, hashApiKey };
