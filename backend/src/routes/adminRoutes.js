const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validate, createTenantSchema, rotateKeySchema } = require('../middleware/validate');
const { authenticateJwt, authorizeRole } = require('../middleware/jwtAuth');

// ── Shared Middleware for Admin Routes ──────────────────────────────────────
router.use(adminLimiter);
router.use(authenticateJwt);
router.use(authorizeRole('admin'));

// ── Tenant Lifecycle Management ──────────────────────────────────────────────
router.post('/tenants', validate(createTenantSchema), adminController.createTenant);
router.get('/tenants', adminController.listTenants);
router.patch('/tenants/:id/suspend', adminController.suspendTenant);
router.patch('/tenants/:id/activate', adminController.activateTenant);
router.get('/tenants/:id/usage', adminController.getTenantUsage);

// KEY ROTATION — returns new plaintext key once, then discards it
router.post('/tenants/:id/rotate-key', validate(rotateKeySchema), adminController.rotateKey);

module.exports = router;
