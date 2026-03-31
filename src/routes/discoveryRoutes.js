const router = require('express').Router();
const discoveryController = require('../controllers/discoveryController');
const { authenticateJwt } = require('../middleware/jwtAuth');

// All discovery routes require valid JWT session
router.use(authenticateJwt);

router.get('/providers', discoveryController.listProviders);
router.get('/providers/:name', discoveryController.getProvider);
router.get('/providers/:name/tools', discoveryController.listProviderTools);
router.get('/usage', discoveryController.getMyUsage);
router.get('/health', discoveryController.health);

module.exports = router;
