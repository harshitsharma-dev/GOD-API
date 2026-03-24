/**
 * GOD API — MongoDB Connection
 * Handles initial connect with retry-on-failure logic.
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/god_api';

const connectDB = async () => {
    const opts = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    };

    try {
        const conn = await mongoose.connect(MONGO_URI, opts);
        console.log(`📦  MongoDB: ${conn.connection.host} / ${conn.connection.name}`);
    } catch (error) {
        console.error(`❌  MongoDB connection failed: ${error.message}`);
        console.error('    Make sure MongoDB is running: mongod --dbpath /data/db');
        throw error; // Let server.js catch and exit
    }
};

module.exports = connectDB;
