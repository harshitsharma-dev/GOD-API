const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

/**
 * GOD API — Main Express App (Production Ready)
 */

app.use(helmet({
    contentSecurityPolicy: isProd ? undefined : false, // Adjust CSP for dev/prod
}));

// More restrictive CORS in production
app.use(cors({
    origin: isProd ? process.env.CORS_ORIGIN || '*' : '*',
    credentials: true,
}));

app.use(compression());
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(requestLogger);
app.use(express.json());

// Global Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 1000 : 5000, 
    message: { 
        success: false, 
        error: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED' 
    }
});
app.use(limiter);

// API Routes
app.use('/api', routes);

// Serve Frontend Build in Production
if (isProd) {
    const buildPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(buildPath));

    // Handle React routing (SPA)
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(buildPath, 'index.html'));
        }
    });
}

// Global Error Handler (must be last)
app.use(errorHandler);

module.exports = app;
