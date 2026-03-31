const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const discoveryRoutes = require('./discoveryRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const gatewayRoutes = require('./gatewayRoutes');

// ── Feature Specific Routes ──────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/discovery', discoveryRoutes);

// ── AI Gateway (Modern & Versioned) ──────────────────────────────────────────
router.use('/v1', gatewayRoutes);
router.use('/v1/_', discoveryRoutes); // Discovery also mounted under v1 namespace

module.exports = router;
