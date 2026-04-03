const mongoose = require('mongoose');

(async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/god_api');
        
        const logs = await mongoose.connection.db.collection('usagelogs')
            .find({ 'tokensUsed.total': { $gt: 0 } })
            .sort({ createdAt: -1 })
            .limit(3)
            .toArray();

        if (logs.length > 0) {
            console.log('SUCCESS: Found logs with token usage!');
            console.log(JSON.stringify(logs, null, 2));
        } else {
            console.log('FAILURE: No logs with token usage found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during token check:', error);
        process.exit(1);
    }
})();
