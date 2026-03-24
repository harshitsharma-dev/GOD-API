/**
 * GOD API — Server Entry Point
 * One Key. Every API. Zero Friction.
 */
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
    try {
        // 1. Connect to MongoDB
        await connectDB();

        // 2. Start HTTP server
        app.listen(PORT, HOST, () => {
            console.log('');
            console.log('╔═══════════════════════════════════════════════╗');
            console.log('║          🌐  GOD API  — v1.0.0               ║');
            console.log('║   One Key. Every API. Zero Friction.          ║');
            console.log('╚═══════════════════════════════════════════════╝');
            console.log(`\n🚀  Server : http://${HOST}:${PORT}`);
            console.log(`🌍  Mode   : ${process.env.NODE_ENV || 'development'}`);
            console.log(`📋  Docs   : http://localhost:${PORT}/v1/_/providers`);
            console.log(`❤️   Health : http://localhost:${PORT}/health\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
