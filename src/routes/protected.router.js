const express = require('express');
const router = express.Router();
const authMiddleware = require('../midddlewares/auth');
const roleAuth = require('../midddlewares/RoleAuth');

// ============ PROTECTED ROUTES EXAMPLES ============

//  User-Only Routes (all authenticated users)
router.get('/profile', authMiddleware, (req, res) => {
    res.json({ 
        message: 'Your profile data', 
        user: req.user 
    });
});

router.put('/profile', authMiddleware, (req, res) => {
    res.json({ 
        message: 'Profile updated', 
        user: req.user 
    });
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
