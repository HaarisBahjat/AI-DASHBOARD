const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const authMiddleware = require('../midddlewares/auth');
const roleAuth = require('../midddlewares/RoleAuth');
const { User } = require('../models/db');

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
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('name email role');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Your profile',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load profile', error: error.message });
    }
});

module.exports = router;