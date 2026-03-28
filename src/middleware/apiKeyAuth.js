const bcrypt = require('bcryptjs');
const User = require('../models/User');

const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.header('X-GOD-API-Key');
        if (!apiKey) throw new Error('API Key is missing');

        const parts = apiKey.split('_');
        const prefix = parts.slice(0, 2).join('_');
        if (!prefix || parts.length < 3) throw new Error('Invalid API Key format');

        const user = await User.findOne({ apiKeyPrefix: prefix }).select('+apiKey');
        if (!user) throw new Error('Invalid API Key');

        const isMatch = await bcrypt.compare(apiKey, user.apiKey);
        if (!isMatch) throw new Error('Invalid API Key');

        req.user = user;
        next();
    } catch (e) {
        res.status(401).json({ success: false, error: e.message || 'Unauthorized' });
    }
};

module.exports = apiKeyAuth;
