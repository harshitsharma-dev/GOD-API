/**
 * GOD API — Zod Validation Middleware
 *
 * Factory function: validate(schema) returns an Express middleware that
 * validates req.body against the given Zod schema and sends a clean 400
 * if validation fails. No try/catch needed in controllers.
 *
 * Usage:
 *   router.post('/tenants', validate(createTenantSchema), controller.createTenant);
 */
const { z } = require('zod');

/**
 * @param {z.ZodSchema} schema  Zod schema to validate req.body against
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
        });
    }

    // Replace req.body with the parsed + coerced result (strips unknown fields)
    req.body = result.data;
    next();
};

// ── Reusable Schemas ───────────────────────────────────────────────────────

const createTenantSchema = z.object({
    name: z
        .string({ required_error: 'name is required' })
        .trim()
        .min(2, 'name must be at least 2 characters')
        .max(100, 'name must be at most 100 characters'),

    email: z
        .string()
        .trim()
        .email('Invalid email address')
        .optional(),

    plan: z
        .enum(['free', 'pro', 'enterprise'], {
            errorMap: () => ({ message: 'plan must be one of: free, pro, enterprise' }),
        })
        .optional()
        .default('free'),
});

const rotateKeySchema = z.object({
    /**
     * How long (in hours) the OLD key remains valid after rotation.
     * Defaults to 24 hours. Set to 0 for immediate revocation.
     */
    gracePeriodHours: z
        .number()
        .int()
        .min(0, 'gracePeriodHours must be >= 0')
        .max(168, 'gracePeriodHours cannot exceed 7 days (168h)')
        .optional()
        .default(24),

    /**
     * Optionally set an expiry on the NEW key (in days).
     * e.g. 90 means the new key auto-expires in 90 days. null = never.
     */
    expiresInDays: z
        .number()
        .int()
        .min(1, 'expiresInDays must be at least 1')
        .max(3650, 'expiresInDays cannot exceed 10 years')
        .nullable()
        .optional()
        .default(null),
});

module.exports = { validate, createTenantSchema, rotateKeySchema };
