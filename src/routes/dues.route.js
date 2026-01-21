const express = require('express');
const router = express.Router();
const authMiddleware = require('../midddlewares/auth');
const roleAuth = require('../midddlewares/RoleAuth');
const duesController = require('../controller/dues.controller');

// Create a new due
router.post('/', authMiddleware, duesController.createDue);
// Get all dues for the authenticated user
router.get('/', authMiddleware, duesController.getDuesByUser);
// Update due status to PAID
router.patch('/:dueId/pay', authMiddleware, duesController.updatedueStatus);
// Admin: Get all dues
router.get('/admin/all', authMiddleware, roleAuth(['ADMIN']), duesController.getAllDues);

module.exports = router;