require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = parseInt(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI is missing in environment variables');
    process.exit(1);
}

// ── Database Connection ──────────────────────────────────────────────────
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

connectDB();

// ── Server Setup ─────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`GOD API Gateway running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// ── Graceful Shutdown ────────────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`\n${signal} signal received: Closing HTTP server...`);
    
    server.close(async () => {
        console.log('HTTP server closed.');
        
        try {
            await mongoose.connection.close(false);
            console.log('MongoDB connection closed.');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err.message);
            process.exit(1);
        }
    });

    // Force shutdown after 10 seconds if graceful check fails
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
