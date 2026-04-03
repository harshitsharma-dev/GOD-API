const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        tenantName: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        provider: {
            type: String,
            required: true,
            index: true,
        },
        endpoint: String,
        method: String,
        statusCode: Number,
        responseTimeMs: {
            type: Number,
            default: 0,
        },
        success: {
            type: Boolean,
            default: true,
            index: true,
        },
        errorMessage: String,
        requestId: {
            type: String,
            index: true,
        },
        tokensUsed: {
            prompt: { type: Number, default: 0 },
            completion: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        bytesIn: { type: Number, default: 0 },
        bytesOut: { type: Number, default: 0 },
        ipHash: String,
        userAgent: String,
        rateLimited: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('UsageLog', usageLogSchema);

