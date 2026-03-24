/**
 * GOD API — Admin Routes (v2)
 *
 * Changes from v1:
 *  - POST /tenants now validated with Zod (createTenantSchema)
 *  - Added POST /tenants/:id/rotate-key (Zod validated with rotateKeySchema)
 */
const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validate, createTenantSchema, rotateKeySchema } = require('../middleware/validate');

router.use(adminLimiter);

router.post('/tenants', validate(createTenantSchema), adminController.createTenant);
router.get('/tenants', adminController.listTenants);
router.patch('/tenants/:id/suspend', adminController.suspendTenant);
router.patch('/tenants/:id/activate', adminController.activateTenant);
router.get('/tenants/:id/usage', adminController.getTenantUsage);

// KEY ROTATION — returns new plaintext key once, then discards it
router.post('/tenants/:id/rotate-key', validate(rotateKeySchema), adminController.rotateKey);

module.exports = router;
