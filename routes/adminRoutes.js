const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Admin routes require authentication and admin role
router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', adminController.getDashboard);

module.exports = router;
