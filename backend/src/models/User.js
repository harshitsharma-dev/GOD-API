const mongoose = require('mongoose');
const { hashPassword, comparePassword } = require('../utils/cryptoFallback');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            select: false,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            default: 'user',
        },
    },
    { timestamps: true }
);

// Hash password before saving if it was modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    // We don't hash here if it's already a hash (controllers handle hashing)
    // But for safety, if it's not in salt:hash format, we hash it.
    if (!this.passwordHash.includes(':')) {
        this.passwordHash = await hashPassword(this.passwordHash);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await comparePassword(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
