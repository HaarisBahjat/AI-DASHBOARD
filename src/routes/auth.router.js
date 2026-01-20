const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const authMiddleware = require('../midddlewares/auth');
const roleAuth = require('../midddlewares/RoleAuth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes (authentication required)
router.post('/logout', authMiddleware, authController.logout);

// Admin-only route (example)
router.get('/admin/users', authMiddleware, roleAuth(['ADMIN']), (req, res) => {
    res.json({ message: 'Admin access granted', user: req.user });
});

// User-only route (example)
router.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: 'Your profile', user: req.user });
});

module.exports = router;