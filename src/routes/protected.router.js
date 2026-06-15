const express = require('express');
const router = express.Router();
const authMiddleware = require('../midddlewares/auth');
const roleAuth = require('../midddlewares/RoleAuth');
const { User } = require('../models/db');

// ============ PROTECTED ROUTES EXAMPLES ============

//  User-Only Routes (all authenticated users)
router.get('/profile', authMiddleware, async (req, res) => {
    const user = await User.findById(req.user._id).select('-passwordHash -refreshToken');
    res.json({ message: 'Your profile data', user });
});

/**
 * PATCH /api/protected/profile
 * Update the current user's profile fields.
 * Currently supports: phone (E.164 format, e.g. +923001234567)
 *
 * Body: { phone: "+923001234567" }
 */
router.patch('/profile', authMiddleware, async (req, res) => {
    try {
        const { phone } = req.body;
        const updates = {};

        if (phone !== undefined) {
            // Basic E.164 validation: starts with + and 7–15 digits
            if (phone !== null && !/^\+[1-9]\d{6,14}$/.test(phone)) {
                return res.status(400).json({
                    message: 'Invalid phone number format. Use E.164 format e.g. +923001234567'
                });
            }
            updates.phone = phone || null;
            updates.phoneVerified = false; // reset verification on number change
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No updatable fields provided.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-passwordHash -refreshToken');

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('Profile update error:', err.message);
        res.status(500).json({ message: 'Failed to update profile', error: err.message });
    }
});



//  Admin-Only Routes
router.get('/admin/dashboard', authMiddleware, roleAuth(['ADMIN']), (req, res) => {
    res.json({ 
        message: 'Admin dashboard', 
        admin: req.user 
    });
});

router.get('/admin/users', authMiddleware, roleAuth(['ADMIN']), (req, res) => {
    res.json({ 
        message: 'All users list', 
        admin: req.user 
    });
});

router.delete('/admin/users/:userId', authMiddleware, roleAuth(['ADMIN']), (req, res) => {
    const { userId } = req.params;
    res.json({ 
        message: `User ${userId} deleted`, 
        admin: req.user 
    });
});

// Moderator-Only Routes
router.post('/moderate/content', authMiddleware, roleAuth(['ADMIN', 'MODERATOR']), (req, res) => {
    res.json({ 
        message: 'Content moderated', 
        moderator: req.user 
    });
});

module.exports = router;
