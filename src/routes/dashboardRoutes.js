/**
 * GOD API — Dashboard & Key Management Routes
 *
 * All routes are protected by JWT middleware.
 */
const router = require('express').Router();
const { getDashboard, rotateKey } = require('../controllers/dashboardController');
const { authenticateJwt } = require('../middleware/jwtAuth');

router.get('/', authenticateJwt, getDashboard);
router.post('/rotate', authenticateJwt, rotateKey);
// Also handle root POST for /keys mount (POST /keys/rotate)
router.post('/', authenticateJwt, rotateKey);


module.exports = router;
