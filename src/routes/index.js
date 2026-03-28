const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const keyController = require('../controllers/key.controller');
const gatewayController = require('../controllers/gateway.controller');
const auth = require('../middleware/auth');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Auth Routes
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);

// API Key Routes (Protected by JWT)
router.post('/keys/generate', auth, keyController.generateKey);
router.get('/keys/status', auth, keyController.viewKeyStatus);

// Gateway Route (Protected by GOD API Key)
router.post('/gateway', apiKeyAuth, gatewayController.handleRequest);

module.exports = router;
