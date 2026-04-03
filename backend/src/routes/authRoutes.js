const router = require('express').Router();
const { signup, login, me } = require('../controllers/authController');
const { authenticateJwt } = require('../middleware/jwtAuth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticateJwt, me);

module.exports = router;
