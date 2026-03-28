const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        provider: {
            type: String,
            required: true,
        },
        request: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        response: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('UsageLog', usageLogSchema);
