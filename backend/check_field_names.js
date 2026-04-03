const mongoose = require('mongoose');

(async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/god_api');
        
        const logByTokensUsed = await mongoose.connection.db.collection('usagelogs').findOne({ 'tokensUsed.total': { $exists: true } });
        console.log('DEBUG: tokensUsed exists?', !!logByTokensUsed);
        if (logByTokensUsed) console.log('Sample tokensUsed:', JSON.stringify(logByTokensUsed.tokensUsed, null, 2));

        const logByTokens = await mongoose.connection.db.collection('usagelogs').findOne({ 'tokens.total': { $exists: true } });
        console.log('DEBUG: tokens exists?', !!logByTokens);
        if (logByTokens) console.log('Sample tokens:', JSON.stringify(logByTokens.tokens, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error during token check:', error);
        process.exit(1);
    }
})();
