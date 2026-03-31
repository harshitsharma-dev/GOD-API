const router = require('express').Router();
const discoveryController = require('../controllers/discoveryController');
const { authenticateJwt } = require('../middleware/jwtAuth');

router.get('/health', discoveryController.health);

// All discovery routes require valid JWT session
router.use(authenticateJwt);

router.get('/providers', discoveryController.listProviders);
router.get('/providers/:name', discoveryController.getProvider);
router.get('/providers/:name/tools', discoveryController.listProviderTools);
router.get('/usage', discoveryController.getMyUsage);

module.exports = router;
