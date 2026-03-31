/**
 * GOD API — Crypto Fallback (bcrypt-free password hashing)
 *
 * Uses Node's built-in crypto module with PBKDF2 for password hashing,
 * avoiding native bcryptjs compilation issues on some environments.
 */
const crypto = require('crypto');

const SALT_BYTES = 32;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2.
 * Returns "salt:hash" format for storage.
 *
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
        crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
};

/**
 * Compare a candidate password against a stored "salt:hash" string.
 *
 * @param {string} candidate
 * @param {string} stored  "salt:hash"
 * @returns {Promise<boolean>}
 */
const comparePassword = (candidate, stored) => {
    return new Promise((resolve, reject) => {
        const [salt, storedHash] = stored.split(':');
        if (!salt || !storedHash) return resolve(false);
        crypto.pbkdf2(candidate, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), derivedKey));
        });
    });
};

module.exports = { hashPassword, comparePassword };
