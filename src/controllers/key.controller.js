const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.generateKey = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: User context required' });
        }
        
        const prefix = 'god_' + crypto.randomBytes(4).toString('hex');
        const rawKey = prefix + '_' + crypto.randomBytes(24).toString('hex');
        const hashedKey = await bcrypt.hash(rawKey, 12);

        req.user.apiKey = hashedKey;
        req.user.apiKeyPrefix = prefix;
        await req.user.save();

        res.json({
            success: true,
            apiKey: rawKey,
            message: 'Store this key safely! It will not be shown again.'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.viewKeyStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            hasKey: !!req.user.apiKeyPrefix,
            prefix: req.user.apiKeyPrefix || null
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
