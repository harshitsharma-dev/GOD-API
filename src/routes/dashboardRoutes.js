const router = require('express').Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateJwt } = require('../middleware/jwtAuth');

// All dashboard and key management routes require valid JWT session
router.use(authenticateJwt);

router.get('/', dashboardController.getDashboard);
router.post('/rotate', dashboardController.rotateKey);

// Backward compatibility (legacy /keys root POST)
router.post('/', dashboardController.rotateKey);

module.exports = router;
