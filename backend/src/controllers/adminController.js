/**
 * GOD API — Admin Controller (v2)
 *
 * Changes from v1:
 *  - createTenant now uses Zod-validated body (handled by validate middleware)
 *  - Added rotateKey endpoint
 */
const AdminService = require('../services/adminService');
const AnalyticsService = require('../services/analyticsService');
const { successResponse } = require('../utils/response');

/** POST /admin/tenants */
exports.createTenant = async (req, res, next) => {
    try {
        // req.body already validated + stripped by validate(createTenantSchema)
        const { name, email, plan } = req.body;
        const result = await AdminService.createTenant({ name, email, plan });
        return successResponse(
            res,
            result,
            '✅ Tenant created. SAVE YOUR API KEY NOW — it cannot be retrieved again.',
            201
        );
    } catch (error) {
        next(error);
    }
};

/** GET /admin/tenants */
exports.listTenants = async (req, res, next) => {
    try {
        const tenants = await AdminService.listTenants();
        return successResponse(res, tenants, `Found ${tenants.length} tenants`);
    } catch (error) {
        next(error);
    }
};

/** PATCH /admin/tenants/:id/suspend */
exports.suspendTenant = async (req, res, next) => {
    try {
        const result = await AdminService.suspendTenant(req.params.id);
        return successResponse(res, result, 'Tenant suspended successfully');
    } catch (error) {
        next(error);
    }
};

/** PATCH /admin/tenants/:id/activate */
exports.activateTenant = async (req, res, next) => {
    try {
        const result = await AdminService.activateTenant(req.params.id);
        return successResponse(res, result, 'Tenant activated successfully');
    } catch (error) {
        next(error);
    }
};

/** GET /admin/tenants/:id/usage */
exports.getTenantUsage = async (req, res, next) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 7, 90);
        const usage = await AnalyticsService.getTenantUsage(req.params.id, days);
        return successResponse(res, usage, 'Usage data retrieved');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /admin/tenants/:id/rotate-key
 * Body (optional): { gracePeriodHours: 24, expiresInDays: null }
 *
 * Rotates the tenant's API key:
 *  - Issues a new key (returned ONCE in the response)
 *  - Old key remains valid for `gracePeriodHours` hours
 *  - keyVersion is incremented
 */
exports.rotateKey = async (req, res, next) => {
    try {
        // req.body already validated by validate(rotateKeySchema)
        const { gracePeriodHours, expiresInDays } = req.body;
        const result = await AdminService.rotateKey(req.params.id, {
            gracePeriodHours,
            expiresInDays,
        });
        return successResponse(
            res,
            result,
            '🔑 Key rotated. SAVE YOUR NEW API KEY — it cannot be retrieved again.'
        );
    } catch (error) {
        next(error);
    }
};
