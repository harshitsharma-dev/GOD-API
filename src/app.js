const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

/**
 * GOD API — Main Express App
 * 
 * Order of operations:
 *  1. Security (Helmet, CORS)
 *  2. Logging (Morgan, RequestLogger)
 *  3. Body Parsing (JSON)
 *  4. Rate Limiting
 *  5. API Routes
 *  6. Error Handling
 */

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(requestLogger);
app.use(express.json());

// Global Global Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, 
    message: { 
        success: false, 
        error: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED' 
    }
});
app.use(limiter);

// API Routes
app.use('/api', routes);

// Global Error Handler (must be last)
app.use(errorHandler);

module.exports = app;
